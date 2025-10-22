[HttpPost("stats/fact")]
public async Task<IActionResult> GetFact([FromBody] Datetimeinput q)
{
    var start = q.StartDate.Date;
    var endEx = q.EndDate.Date.AddDays(1);

    // 1) FLAT (LEFT JOIN’ler + bayraklar + son karar)
    var flatQ =
        from r in _ctx.Reports.AsNoTracking()
        where r.CreatedDate >= start && r.CreatedDate < endEx

        join p in _ctx.Provisions.AsNoTracking() on r.ProvisionId equals p.Id
        join h in _ctx.Hospitals.AsNoTracking() on p.HospitalId equals h.Id
        join c in _ctx.Cities.AsNoTracking() on h.CityId equals c.Id

        join dg0 in _ctx.Dispatch.AsNoTracking() on p.DispatchId equals dg0.Id into dgx
        from dg in dgx.DefaultIfEmpty()

        join rk0 in _ctx.Ranks.AsNoTracking() on dg.RankId equals rk0.Id into rkx
        from rk in rkx.DefaultIfEmpty()

        join f0 in _ctx.Forces.AsNoTracking() on dg.ForceId equals f0.Id into fx
        from f in fx.DefaultIfEmpty()

        join rdx0 in _ctx.ReportDiagnoses.AsNoTracking() on r.Id equals rdx0.ReportId into rdxg
        from rdx in rdxg.DefaultIfEmpty()

        join dx0 in _ctx.Diagnoses.AsNoTracking() on rdx.DiagnosisId equals dx0.Id into dxg
        from dx in dxg.DefaultIfEmpty()

        select new
        {
            r.Id,
            r.Code,
            r.CreatedDate,
            r.State,

            CityId = c.Id,
            c.CityCode,
            c.CityName,
            HospitalId = h.Id,
            HospitalCode = h.Code,
            HospitalName = h.Name,
            ProvisionId = p.Id,
            ProvisionCode = p.Code,

            RankId = (Guid?)(rk != null ? rk.Id : null),
            RankName = rk != null ? rk.Name : null,
            ForceId = (Guid?)(f != null ? f.Id : null),
            ForceName = f != null ? f.Name : null,

            DxCode = dx != null ? dx.Code : null,
            DxName = dx != null ? dx.Name : null,

            // issuer bayrakları
            HasMB  = _ctx.ReportDecisions.Any(z => z.ReportId == r.Id && z.HCDecision.BakanlikOnay == 1),
            HasPTM = _ctx.ReportDecisions.Any(z => z.ReportId == r.Id && z.HCDecision.TeminOnay   == 1),

            // son karar
            LastDecision = (
                from z in _ctx.ReportDecisions
                where z.ReportId == r.Id
                orderby z.CreatedDate descending
                select new { z.Id, z.HCDecision.Code, z.HCDecision.Name }
            ).FirstOrDefault(),

            // approver (rapor üstündeki kullanıcı id)
            ApproverUserId = r.ApprovalUserId    // tipin Guid? değilse uyumla
        };

    var flat = await flatQ.ToListAsync();

    // 2) RAPOR BAZINDA TEKILLEŞTIR (tanıları CSV yap)
    var grouped = flat
        .GroupBy(x => new
        {
            x.Id, x.Code, x.CreatedDate, x.State,
            x.CityId, x.CityCode, x.CityName,
            x.HospitalId, x.HospitalCode, x.HospitalName,
            x.ProvisionId, x.ProvisionCode,
            x.RankId, x.RankName, x.ForceId, x.ForceName,
            x.HasMB, x.HasPTM, x.LastDecision,
            x.ApproverUserId
        })
        .Select(g => new FactReportDto
        {
            ReportId        = g.Key.Id,
            ReportCode      = g.Key.Code,
            CreatedDate     = g.Key.CreatedDate,
            ReportState     = (int)g.Key.State,
            ReportStateName = g.Key.State.ToString(),

            CityId          = g.Key.CityId,
            CityCode        = g.Key.CityCode,
            CityName        = g.Key.CityName,

            HospitalId      = g.Key.HospitalId,
            HospitalCode    = g.Key.HospitalCode,
            HospitalName    = g.Key.HospitalName,

            ProvisionId     = g.Key.ProvisionId,
            ProvisionCode   = g.Key.ProvisionCode.ToString(),

            RankId          = g.Key.RankId,
            RankName        = g.Key.RankName,
            ForceId         = g.Key.ForceId,
            ForceName       = g.Key.ForceName,

            DecisionId      = g.Key.LastDecision != null ? g.Key.LastDecision.Id   : (Guid?)null,
            DecisionCode    = g.Key.LastDecision != null ? g.Key.LastDecision.Code : (int?)null,
            DecisionName    = g.Key.LastDecision != null ? g.Key.LastDecision.Name : null,

            Issuer          = g.Key.HasMB ? "MB" : (g.Key.HasPTM ? "PTM" : "BH"),

            DiagnosesCsv        = string.Join("; ", g.Where(x => x.DxCode != null)
                                                     .Select(x => $"{x.DxCode} - {x.DxName}")
                                                     .Distinct()),
            DiagnosisCodesCsv   = string.Join("; ", g.Where(x => x.DxCode != null)
                                                     .Select(x => x.DxCode)
                                                     .Distinct()),

            // approver id’yi taşı
            ApproverUserId  = g.Key.ApproverUserId
        })
        .ToList();

    // 3) APPROVER KULLANICILARINI TEK SEFERDE ÇEK (AuthDbContext)
    var approverIds = grouped.Where(r => r.ApproverUserId.HasValue)
                             .Select(r => r.ApproverUserId!.Value)
                             .Distinct()
                             .ToList();

    if (approverIds.Count > 0)
    {
        var users = await _auth.Users
            .AsNoTracking()
            .Where(u => approverIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                DisplayName = u.FullName ?? u.UserName,
                u.Email
            })
            .ToListAsync();

        var map = users.ToDictionary(u => u.Id, u => u);

        // 4) IN-MEMORY EŞLE
        foreach (var r in grouped)
        {
            if (r.ApproverUserId.HasValue && map.TryGetValue(r.ApproverUserId.Value, out var u))
            {
                r.ApproverName  = u.DisplayName;
                r.ApproverEmail = u.Email;
            }
        }
    }

    return Ok(grouped);
}

