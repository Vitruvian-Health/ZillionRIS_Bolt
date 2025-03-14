<%@ Control Language="C#" AutoEventWireup="true" EnableViewState="true" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="RISC" Namespace="Rogan.ZillionRis.WebControls.Common" Assembly="Rogan.ZillionRis.WebControls" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<CD:JsInclude ID="JsInclude1" FilePath="~/Controls/PatientSearchCriteriaControl.js"  runat="server" />
<style>
.dxeButtonEdit_Aqua.dxeDisabled_Aqua,.dxeEditArea_Aqua.dxeDisabled_Aqua
{
    background-color: #808080!important;
}
.requesterTypes {
    margin-left: 15px;
}
.ui-group-panel, .ui-group-panel-content {
    overflow: visible;
}

.aps-filter-container {
    overflow: visible;
    margin-left: 10px;
}

.aps-filter-category {
    margin-right: 10px;
    display: inline-block;
    white-space: normal;
    margin-top: 10px;
}
.ui-input[readonly], .ui-input[disabled], .zpselect-disabled .zpselect-single .selected, .zpselect-disabled .zpselect-multi .selected  {
    background: #d4d4d4!important
}

</style>
	<div id="CriteriasDiv" class="aps-filter-container">
        <div style="width:430px; height:285px;" class="aps-filter-category" >
	        <div id="SearchPatientsGroupPanel" title="<%: WebResources.PatientSearch_SearchPatients %>" class="no-padding" >
                    <div style="width:200px; float:left;">
                        <ul style="list-style-type:none; margin-left:5px">
	                        <li>
		                        <asp:label Text="<%$ Resources:WebResources, pat_PatientNumber %>" runat="server" />
                                <input id="PatientNumber" type="text" style="width: 160px" class="ui-input" onkeydown="PatientNumber_KeyDown()" />
	                        </li>
                            <li>
		                        <asp:label Text="<%$ Resources:WebResources, ltSocialSecurityNumber %>" runat="server" />
                                <input id="SocialSecurityNumber" type="text" style="width: 160px" class="ui-input" onkeydown="SocialSecurityNumber_KeyDown()" />
	                        </li>
	                        <li>
		                        <asp:label Text="<%$ Resources:WebResources, pat_FirstName %>" runat="server" />
                                <input id="GivenName" type="text" style="width: 160px" class="ui-input" />
	                        </li>
	                        <li>
		                        <asp:label Text="<%$ Resources:WebResources, pat_LastName %>" runat="server" />
                                <input id="FamilyName" type="text" style="width: 160px" class="ui-input" />
	                        </li>
	                        <li>
		                        <asp:label Text="<%$ Resources:WebResources, ltDateOfBirth %>" runat="server" />
                                <input id="BirthDateEditInput" style="width: 160px" class="ui-input" type="text" data-bind="datepicker: birthDate, datepickerOptions: { yearRange: '-200:+0' }, attr: { disabled: datesDisabled() }" />
	                        </li>
	                        <li>
		                        <asp:label Text="<%$ Resources:WebResources, ltGender %>" runat="server" />
                                <span id="GenderSelection" style="width: 160px" data-bind="zpSelect: { source: genders, legacyBind: true, behavior: 'single', captionText: '-', value: selectedgender, selectID: 'genderID', selectText: 'genderName' }"></span>
	                        </li>
                        </ul>
                    </div>
                    <div style="width:190px; float:left;">
                        <ul style="list-style-type:none; margin-left:5px">
	                        <li>
                                <div id="LocationGroupsDiv">
                                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_LocationGroup %>" runat="server" />
                                    <span id="LocationGroupSelection" style="width: 160px" data-bind="zpSelect: { source: availableLocationGroups, legacyBind: true, behavior: 'single', captionText: '-', value: selectedLocationGroup, selectID: 'locationGroupID', selectText: 'locationGroupName' }"></span>
                                </div>
	                        </li>
	                        <li>
                                <div style="display:none;" id="LocationFilter">
                                    <br/>
                                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_CurrentPatientLocation %>" runat="server" />
                                    <ul style="list-style-type:none; margin-top:5px">
	                                    <li>
		                                    <asp:label Text="Point Of Care" runat="server" />
                                            <asp:TextBox ID="Location_PointOfCare" ClientIDMode="Static" Width="160px"  runat="server" CssClass="ui-input" />
	                                    </li>
	                                    <li>
		                                    <asp:label Text="Room" runat="server" />
                                            <asp:TextBox ID="Location_Room" ClientIDMode="Static" Width="160px"  runat="server" CssClass="ui-input" />
	                                    </li>
	                                    <li>
		                                    <asp:label Text="Bed" runat="server" />
                                            <br />
                                            <asp:TextBox ID="Location_Bed" ClientIDMode="Static" Width="160px"  runat="server" CssClass="ui-input" />
	                                    </li>
                                    </ul>
                                </div>
	                        </li>
                            <li>
                                <asp:Label Text="<%$ Resources:WebResources, ltPhoneNumber %>" runat="server" />
                                <input id="PhoneNumber" type="text" style="width: 160px" class="ui-input" />
                            </li>
                        </ul>
                    </div>
            </div>
        </div>
        <div style="width:250px; height:285px;" class="aps-filter-category">
	        <div id="FilterOrdersGroupPanel" title="<%: WebResources.PatientSearch_FilterOrders %>" class="no-padding" >
                <div style="width:220px; float:left;">
                    <ul style="list-style-type:none; margin-left:5px">
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, ltOrderNumber %>" runat="server" />
                            <input id="OrderNumber" type="text" style="width: 200px" class="ui-input" onkeydown="OrderNumber_KeyDown()" />
	                    </li>
	                    <li style="height: 80px">
	                        <div style="width: 200px">
	                            <asp:label Text="<%$ Resources:WebResources, PatientSearch_RequestingResponsibleConsultant %>" runat="server" />
                                <br/>
                                <div>
                                    <input type="radio" name="RequesterTypeSelector" value="requesterGP" data-bind="checked: requesterTypeSelector" class="requesterTypes" ><%: WebResources.GeneralPractitioner %> 
                                    <br>
                                    <input type="radio" name="RequesterTypeSelector" value="requesterConsultant" data-bind="checked: requesterTypeSelector" class="requesterTypes"  ><%: WebResources.PatientSearch_Consultant%>
                                </div>
                            </div>
                            <div id="RequestingResponsibleConsultantDiv" data-bind="with: requestingResponsibleConsultantSource()">
						        <input id="RequestingResponsibleConsultantInput" type="text" style="width: 200px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: $root.requestingResponsibleConsultant, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                            </div>
					    </li>
                        <li>
                            <div id="RequestingWorkLocationDiv">
						        <asp:label Text="<%$ Resources:WebResources, PatientSearch_RequestingGPWorkLocation %>" runat="server" />
                                <span id="RequestingWorkLocation" style="width: 200px" data-bind="zpSelect: { source: requestingWorkLocations, legacyBind: true, behavior: 'single', captionText: '-', value: selectedRequestingWorkLocations, selectID: 'requestingworklocationID', selectText: 'requestingworklocationName' }"></span>
                            </div>
	                    </li>
	                    <li>
	                        <div id="RequesterLocationDiv" style="display:none;" >
		                        <asp:label Text="<%$ Resources:WebResources, PatientSearch_RequesterLocation %>" runat="server" />
                                <span id="RequesterLocation" style="width: 200px" data-bind="zpSelect: { source: requesterLocations, legacyBind: true, behavior: 'single', captionText: '-', value: selectedRequesterLocation, selectID: 'requesterLocationID', selectText: 'requesterLocationName' }"></span>
                            </div>
	                    </li>
                        <li>
                            <div id="CurrentResponsibleConsultantDiv" data-bind="with: currentResponsibleConsultant" >
						        <asp:label Text="<%$ Resources:WebResources, PatientSearch_CurrentResponsibleConsultant %>" runat="server" />
						        <input id="CurrentResponsibleConsultantInput" type="text" style="width: 200px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: setSelectedValue, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                            </div>
					    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_PatientCategory %>" runat="server" />
                            <span id="PatientCategory" style="width: 200px" data-bind="zpSelect: { source: patientCategories, legacyBind: true, behavior: 'single', captionText: '-', value: selectedPatientCategory, selectID: 'patientcategoryID', selectText: 'patientcategoryName' }"></span>
	                    </li>
                    </ul>
                </div>
            </div>
        </div>
        <div style="width:660px; height:285px;" class="aps-filter-category">
	        <div id="FilterExaminationsGroupPanel" title="<%: WebResources.PatientSearch_FilterExaminations %>" class="no-padding" >
                <div style="width:200px; float:left;  margin-left:5px">
                    <ul style="list-style-type:none;">
   	                    <li>
		                    <asp:label ID="Label2" Text="<%$ Resources:WebResources, stu_AccessionNumber %>" runat="server" />
                            <input id="AccessionNumber" type="text" style="width: 160px" class="ui-input" onkeydown="AccessionNumber_KeyDown()" />
	                    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_ModalityType %>" runat="server" />
                            <span id="ModalitySelection" style="width: 160px" data-bind="zpSelect: { source: modalities, legacyBind: true, behavior: 'single', captionText: '-', value: selectedmodality, selectID: 'modalityID', selectText: 'modalityName' }"></span>
	                    </li>
                        <li>
                            <div id="examinationTypesDiv" data-bind="with: examinationTypes">
						        <asp:label Text="<%$ Resources:WebResources, ReceptionLow_ExaminationTypes %>" runat="server" />
						        <input id="ExaminationTypesInput" type="text" style="width: 160px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: setSelectedValue, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value', jqAutoSourceCode: 'code'" class="ui-input" />
                            </div>
					    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_ExaminationRoom %>" runat="server" />
                            <span id="RoomSelection" style="width: 160px" data-bind="zpSelect: { source: rooms, legacyBind: true, behavior: 'single', captionText: '-', value: selectedroom, selectID: 'roomID', selectText: 'roomName' }"></span>
	                    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_DatePeriodStart %>" runat="server" />
                            <input id="StartDateEdit" style="width: 160px" class="ui-input" type="text" data-bind="datepicker: startDate, datepickerOptions: { yearRange: '-50:+20' }, attr: { disabled: datesDisabled() }" />
	                    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_DatePeriodEnd %>" runat="server" />
                            <input id="EndDateEdit" style="width: 160px" class="ui-input" type="text" data-bind="datepicker: endDate, datepickerOptions: { yearRange: '-50:+20' }, attr: { disabled: datesDisabled() }" />
	                    </li>
                    </ul>
                </div>
                <div style="width:200px; float:left;">
                    <ul style="list-style-type:none;">
	                    <li>
                            <div id="OperatorDiv" data-bind="with: operator" >
						        <asp:label Text="<%$ Resources:WebResources, PatientSearch_Operator %>" runat="server" />
						        <input id="OperatorInput" type="text" style="width: 160px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: setSelectedValue, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                            </div>
	                    </li>
	                    <li>
                            <div id="ReporterDiv" data-bind="with: reporter" >
						        <asp:label Text="<%$ Resources:WebResources, PatientSearch_Reporter %>" runat="server" />
						        <input id="ReporterInput" type="text" style="width: 160px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: setSelectedValue, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                            </div>
	                    </li>
	                    <li>
                            <div id="IntendedReporterDiv" data-bind="with: intendedreporter" >
						        <asp:label Text="<%$ Resources:WebResources, PatientSearch_IntendedReporter %>" runat="server" />
						        <input id="IntendedReporterInput" type="text" style="width: 160px" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: setSelectedValue, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                            </div>
	                    </li>
	                    <li>
		                    <asp:label Text="<%$ Resources:WebResources, PatientSearch_WorkflowStatus %>" runat="server" />
                            <span id="WorkflowStatus" style="width: 160px" data-bind="zpSelect: { source: examinationStatuses, legacyBind: true, behavior: 'single', captionText: '-', value: selectedExaminationStatus, selectID: 'examstatusID', selectText: 'examstatusName' }"></span>
	                    </li>
                    </ul>
                </div>
                <div style="width:220px; float:left;">
                    <ul style="list-style-type:none;">
	                    <li>     
                            <asp:label Text="<%$ Resources:WebResources, ltClinicalInformation %>" runat="server" />
                            <asp:TextBox ID="ClinicalInformationTextBox" ClientIDMode="Static" TextMode="multiline" Width="200px" Height="90px" runat="server"
                                         ToolTip="<%$ Resources:WebResources, PatientSearch_TooltipClinicalInformation %>" CssClass="ui-input" />
	                    </li>
                        <li style="margin-top:1px;">     
                            <asp:label Text="Report" runat="server" />
                            <asp:TextBox ID="ReportTextBox" ClientIDMode="Static" TextMode="multiline" Width="200px" Height="90px" runat="server" 
                                         ToolTip="<%$ Resources:WebResources, PatientSearch_TooltipReport %>" CssClass="ui-input" />
	                    </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="aps-filter-category">
	        <div>
		        <RISC:JQueryButton Width="150px" ID="GeneralSearchButton" AutoPostBack="false" Text="<%$ Resources: WebResources, ltSearch %>" OnClientClick="SearchButton_OnClick()" runat="server" />
	        </div>
            <div style="padding-top:10px">
		        <RISC:JQueryButton Width="150px" ID="ClearFieldsButton" AutoPostBack="false" Text="<%$ Resources: WebResources, ltClearFields %>" OnClientClick="ClearFieldsButton_OnClick()" runat="server" />
	        </div>
        </div>
    </div>
