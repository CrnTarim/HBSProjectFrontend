import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SingerSearchPipe } from './pipe/singer-search.pipe';
import { OrderByPipe } from './pipe/order-by.pipe';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { singlesongReducer } from './state/song/song.reducer';
import { UserComponent } from './components/user/user.component';
import { LoginComponent } from './components/login/login.component';

import { MessageComponent } from './components/message/message.component';
import { DxSelectBoxModule, DxDataGridModule, DxListModule, DxTextBoxModule, DxTagBoxModule, DxButtonModule, DxPieChartModule, DxPivotGridModule, DxPopupModule } from 'devextreme-angular';
import { PersonComponent } from './components/person/person.component';

import { ReportComponent } from './components/report/report.component';
import { ReportgridComponent } from './components/reportgrid/reportgrid.component';
import { LinechartComponent } from './components/linechart/linechart.component';
import { DefinitionsComponent } from './components/definitions/definitions.component';
import { RankComponent } from './components/definitions/rank/rank.component';

// ng g pipe/singerSearch dedigimiz icin otomatik olusturuldu


@NgModule({
  declarations: [
    AppComponent,
    SingerSearchPipe,
    OrderByPipe,
    UserComponent,
    LoginComponent,
    MessageComponent,
    PersonComponent,
    ReportComponent,
    ReportgridComponent,
    LinechartComponent,
    DefinitionsComponent,
    RankComponent ,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule, // diğer link sayfalarına gidebilmek icin
    HttpClientModule, // http methodları için
    FormsModule, 
    DxSelectBoxModule,
    DxDataGridModule,
    DxListModule,
    DxTextBoxModule,
    FormsModule,
    DxDataGridModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    DxDataGridModule,
    DxTagBoxModule,
    DxButtonModule,
    DxPieChartModule,
    DxPieChartModule,
    DxPivotGridModule,
    DxPopupModule, 
    ReactiveFormsModule,
    StoreModule.forRoot({activeSingleSong:singlesongReducer})
 
  
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
