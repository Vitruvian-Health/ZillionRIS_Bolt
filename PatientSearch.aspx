<%@ Page Language="C#" MasterPageFile="LowProfileMaster.master" CodeBehind="PatientSearch.aspx.cs" Inherits="Rogan.ZillionRis.Website.PatientSearch" %>
<%@ Import Namespace="ZillionRis.Common" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
    <CD:JsInclude FilePath="~/PatientSearch.js" Priority="100" runat="server" />
    <%= this.Include("module://workflow/scripts/correct-administration-errors")%>
    <%= this.Include("module://workflow/scripts/create-dummy-patient") %>
    <style>
        #Content { margin: 120px 0 0 0; padding: 10px; }
    </style>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="Server">
    <div id="PatientSearchPage" zp-fluids="fill">
        <div zp-fluids="fixed">
            <div class="page-info-banner">
                <span><%: WebResources.PatientSearch_ChangeSearchType %><a href="javascript:void(0)" data-bind="click: changeSearch.bind($data, 1)"><%: WebResources.LowProfileMaster_SearchOptions_LastName %></a>, <a href="javascript:void(0)" data-bind="click: changeSearch.bind($data, 2)"><%: WebResources.LowProfileMaster_SearchOptions_MaidenName %></a>, <a href="javascript:void(0)" data-bind="click: changeSearch.bind($data, 8)"><%: WebResources.LowProfileMaster_SearchOptions_DateOfBirth %></a>, <a href="javascript:void(0)" data-bind="click: changeSearch.bind($data, 32)"><%: WebResources.LowProfileMaster_SearchOptions_OrderNumber %></a>, <a href="javascript:void(0)" data-bind="click: changeSearch.bind($data, 64)"><%: WebResources.LowProfileMaster_SearchOptions_AccessionNumber %></a> <%: WebResources.PatientSearch_OrTry %> <a href="<%= this.ResolveClientUrl("~/advanced/patient/search") %>"><%: WebResources.ltAdvancedSearch %></a>.</span>
            </div>
        </div>
        <div class="ui-group-panel" id="PatientPanel" data-bind="with: patientGrid" zp-fluids="fill" style="margin-top: 10px">
            <div class="ui-group-panel-header" zp-fluids="fixed">
                <span class="ui-group-panel-title" data-bind="text: title"><%: WebResources.ltPatientSearchResult %></span>
            </div>
            <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                <div id="PatientSearchGrid" zp-fluids="fill">
                </div>
            </div>
            <div class="ui-group-panel-toolbar bottom ui-helper-clearfix" zp-fluids="fixed" id="PatientsButtons" data-bind="visible: patientButtonsVisible" runat="server">
                <span class="right">
                    <button id="CreateDummyPatient" type="button" class="btn" data-bind="click: createDummyPatient"><%: WebResources.Button_CreateDummyPatient %></button>
                    <button id="CreatePatient" type="button" class="btn"><%: WebResources.ltNewPatient %></button>
                </span>
            </div>
        </div>
        <div class="ui-group-panel" id="HistoryPanel" data-bind="with: historyGrid" zp-fluids="fill" style="margin-top: 10px">
            <div class="ui-group-panel-header" zp-fluids="fixed">
                <span class="ui-group-panel-title" data-bind="text: title"><%: WebResources.ltExaminationOverview %></span>
            </div>
            <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                <div id="PatientHistoryGrid" zp-fluids="fill">
                </div>
            </div>
        </div>
        <div zp-fluids="fixed" class="page-bottom-fixed-bar">
            <span class="left">
                <button type="button" class="btn" id="AbortButton"><%: WebResources.General_AbortButton %></button>
            </span>
            <span class="right">
                <button type="button" class="btn" id="CreateOrder" data-bind="visible: createOrderEnabled" accesskey="N"><%: WebResources.ltNewOrder %></button>
                <button type="button" class="btn" id="ImportOrder" data-bind="visible: importOrderEnabled"><%: WebResources.ltImportOrder %></button>
            </span>
        </div>
    </div>
</asp:Content>
