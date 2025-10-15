[HttpPost("stats/fact")]
public async Task<IActionResult> GetFact([FromBody] Datetimeinput dt)
{
    var start = dt.StartDate.Date;
    var endEx = dt.EndDate.Date.AddDays(1);   // < endEx önemli

    // 1) Rapor×Tanı TEKİL
    var rpDx =
        _ctx.ReportDiagnoses.AsNoTracking()
            .Select(x => new { x.ReportId, x.DiagnosisId })
            .Distinct();

    // 2) Her rapor için EN SON karar (EF için güvenli desen)
    var rdMax =
        from rd in _ctx.ReportDecisions.AsNoTracking()
        group rd by rd.ReportId into g
        select new { ReportId = g.Key, MaxCreated = g.Max(x => x.CreatedDate) };

    // 3) Flat set (karar tekilleştirildi, tanı tekilleştirildi)
    var q =
        from r in _ctx.Reports.AsNoTracking()
        where r.CreatedDate >= start && r.CreatedDate < endEx
        join p in _ctx.Provisions.AsNoTracking() on r.ProvisionId equals p.Id
        join h in _ctx.Hospitals.AsNoTracking() on p.HospitalId equals h.Id
        join c in _ctx.Cities.AsNoTracking()    on h.CityId     equals c.Id

        // Provision -> Dispatch (LEFT)
        join d0 in _ctx.Dispatch.AsNoTracking() on p.DispatchId equals d0.Id into dg
        from d in dg.DefaultIfEmpty()

        // Dispatch -> Force/Rank (LEFT)
        join f0 in _ctx.Forces.AsNoTracking() on d.ForceId equals f0.Id into fg
        from f in fg.DefaultIfEmpty()
        join rk0 in _ctx.Ranks.AsNoTracking() on d.RankId equals rk0.Id into rkg
        from rk in rkg.DefaultIfEmpty()

        // En son karar (LEFT)
        join m in rdMax on r.Id equals m.ReportId into mg
        from mx in mg.DefaultIfEmpty()
        join rd1 in _ctx.ReportDecisions.AsNoTracking()
             on new { ReportId = r.Id, Created = mx.MaxCreated }
             equals new { ReportId = rd1.ReportId, Created = (DateTime?)rd1.CreatedDate } into rdg
        from rd in rdg.DefaultIfEmpty()
        join hcd0 in _ctx.HCDecisions.AsNoTracking() on rd.DecisionId equals hcd0.Id into hcdg
        from hcd in hcdg.DefaultIfEmpty()

        // Tanı: TEKİL rapor×tanı seti
        join pair in rpDx on r.Id equals pair.ReportId
        join dx in _ctx.Diagnoses.AsNoTracking() on pair.DiagnosisId equals dx.Id

        select new
        {
            reportId = r.Id,
            reportCode = r.Code,
            createdDate = r.CreatedDate,
            reportState = (int)r.State,
            reportStateName = r.State.ToString(),

            cityId = c.Id, cityCode = c.CityCode, cityName = c.CityName,
            hospitalId = h.Id, hospitalCode = h.Code, hospitalName = h.Name,
            provisionId = p.Id, provisionCode = p.Code.ToString(),

            dispatchId = (Guid?)d.Id,
            forceId = (Guid?)f.Id, forceCode = (int?)f.Code, forceName = f.Name,
            rankId = (Guid?)rk.Id, rankCode = (int?)rk.Code, rankName = rk.Name,

            diagnosisId = dx.Id, diagnosisCode = dx.Code, diagnosisName = dx.Name,

            decisionId = (Guid?)hcd?.Id,
            decisionCode = (int?)hcd?.Code,
            decisionName = hcd?.Name,
            issuer = hcd == null ? "BH"
                    : (hcd.BakanlikOnay == 1 ? "MB"
                    : (hcd.TeminOnay == 1 ? "PTM" : "BH"))
        };

    return Ok(await q.ToListAsync());
}
