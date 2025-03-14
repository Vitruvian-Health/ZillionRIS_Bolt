<%@ Page Language="C#" AutoEventWireup="True" CodeBehind="frmAdvancedPatientSearch.aspx.cs" Inherits="ZillionRis.AdvancedPatientSearch" EnableEventValidation="false" %>
<%@ Import Namespace="ZillionRis.Common" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<%@ Register TagPrefix="locRIS" TagName="PatientSearchCriteriaControl" Src="~/Controls/PatientSearchCriteriaControl.ascx" %>

<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="Server">
	<CD:JsInclude ID="JsInclude1" FilePath="~/frmAdvancedPatientSearch.js" Priority="101" runat="server" />
    <%= this.Include("module://workflow/scripts/correct-administration-errors")%>
</asp:Content>
<asp:Content ContentPlaceHolderID="MainContent" runat="Server">
	<locRIS:PatientSearchCriteriaControl ID="Criteria" runat="server" /> <%-- OnSearchClick="OnSearch"  OnPIXSearchClick="PIXOnSearch" --%>
	<br />
    <div id="PatientsSearchResultContainer" style="margin-left:10px; margin-top: 10px; width: 35%; position: relative; float: left;" >
		<div id="PatientsSearchResultGridPanel" class="no-padding" title="<%: WebResources.AdvancedPatientSearchPage_PatientsSearchResultGridViewHeader %>" >
			<div id="PatientsSearchResultGridView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,General_LoadingOverlay}'), show: isLoading(), delay: 10 }" style="min-height:250px">
			</div>
        </div>
		<div id="PatientsButtons" style="text-align: right">
            <button type="button" class="btn" id="CreateOrder" data-bind="visible: createOrderEnabled" accesskey="N"><%: WebResources.ltNewOrder %></button>
            <button type="button" class="btn" id="ImportOrder" data-bind="visible: importOrderEnabled"><%: WebResources.ltImportOrder %></button>
		</div>
    </div>
    <div id="PatientHistoryContainer" style="margin-top: 10px; width: 63%;  margin-left: 10px; float: left;" >
		<div id="PatientHistoryGridPanel" class="no-padding" title="<%: WebResources.Imaging_PatientHistoryCaption %>" >
			<div id="PatientHistoryGridView" style="min-height: 250px">
			</div>
        </div>
    </div>
</asp:Content>
