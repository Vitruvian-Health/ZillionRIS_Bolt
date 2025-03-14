<%@ Page Language="C#" AutoEventWireup="true" Inherits="ZillionRis.frmPatients" CodeBehind="frmPatients.aspx.cs" %>
<%@ Import Namespace="ZillionRis.Controls" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="RISC" Namespace="Rogan.ZillionRis.WebControls.Common" Assembly="Rogan.ZillionRis.WebControls" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content id="Content1" contentplaceholderid="HeadContent" runat="server">
	<CD:JsInclude ID="JsInclude1" FilePath="~/frmPatients.js" Priority="101" runat="server" />
	<style>
		body { background: #cedff2; }
        .form-table-label { width: 160px; }
        .form-table-row .ui-input, .form-table-row .zpselect { width: 180px; }
	</style>
</asp:content>
<asp:content contentplaceholderid="MainContent" runat="Server">	
	<div class="sub-page-nav" style="max-width: 1200px; padding: 10px 0 120px 0; margin: auto">
		<% if (this.IsExistingPatient == false)
	 { %>
		<h1 class="section-title sub-page-nav-title"><%: WebResources.frmPatients_CreatePatient %></h1>
		<% }
	 else
	 { %>
		<h1 class="section-title sub-page-nav-title"><%: WebResources.frmPatients_EditPatient %> <%: this.PatientName %></h1>
		<% } %>
	    <div class="sub-page-nav-inner-content ui-corner-all">
	        <input type="hidden" id="HiddenPatientId" clientidmode="Static" runat="server" />
	        <input type="hidden" id="HiddenWithoutHIS" clientidmode="Static" runat="server" />
            <div id="TabsControlDiv" class="">
                <ul class="panel-nav">
                    <li data-bind="click: changeTab.bind($data, 'PatientTabs'), css: { 'panel-nav-item-active': selectedTab() === 'PatientTabs' }" class="panel-nav-item clickable" style="">
                        <span><%: WebResources.frmPatients_PatientsInformation %></span>
                    </li><li data-bind="click: changeTab.bind($data, 'AdmissionHistoryTab'), css: { 'panel-nav-item-active': selectedTab() === 'AdmissionHistoryTab' }" class="panel-nav-item clickable" style="">
                        <span><%: WebResources.ltPatientAdmissionHistory%></span>
                    </li><% if (this.NextOfKinTabVisible)
                             { 
                         %><li data-bind="click: changeTab.bind($data, 'NextOfKinTabPanel'), css: { 'panel-nav-item-active': selectedTab() === 'NextOfKinTabPanel' }" class="panel-nav-item clickable" style="">
                            <span><%: WebResources.ltNextOfKinInformation %></span>
                        </li><% } %>
                </ul>
                <div class="sub-page-nav-inner-content-padding">
                    <hr/>
                    <div id="PatientTabs" class="cloak" zp-fluids="fixed" style="white-space: nowrap" >
		                <h2><%: WebResources.ltPersonalInformation%></h2>
	                    <asp:UpdatePanel data-bind="with: readOnlyVM" ID="PatientEditContainer" UpdateMode="Conditional" runat="server">
		                    <ContentTemplate>
			                    <%-- The Patient Information Tab --%>
			                    <%-- The Personal Information Group --%>
			                    <div id="PatientEditControllerContent" class="form-margin new-form">
				                    <div class=" inline-block-clearfix">
					                    <%-- Form Sections Start --%>
					                    <div class="form-table-column">
						                    <% if (this.DummyPatientCheckVisible)
						                    { %>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltDummyPatient %></label>
							                    <span class="input-field">
								                    <asp:CheckBox ID="cbDummyPatient" AutoPostBack="true" Enabled="false" runat="server" />
							                    </span>
						                    </div>
						                    <% } %>
						                    <div class="form-table-row">
						                        <label class="form-table-label"><%: WebResources.ltPatientNumber%></label>
							                    <span class="input-field">
								                    <asp:Label CssClass="label" runat="server" ID="lblPatientID" Text="..." />
							                    </span>
						                    </div>
						                    <div class="form-table-row">
						                        <label class="form-table-label"><%: WebResources.ltSocialSecurityNumber%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblSSN, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
						                        <label class="form-table-label"><%: WebResources.ltLastName%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblLastName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }, value: lastNameValue, validation: { valid: lastNameValue}" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
						                        <label class="form-table-label"><%: WebResources.ltPrefix%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblPrefix, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltFirstName%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblFirstName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.PatientInformation_MiddleNameLabel%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.MiddleNameLabel, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltPartnerName%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblPartnerName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltPartnerPrefix %></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblPartnerPrefix, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltInitials %></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.lblInitials, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
					                    </div>
					                    <%-- Form Section Split --%>
					                    <div class="form-table-column">
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltDateOfBirth%></label>
							                    <span class="input-field">
								                    <%= this.DatePickerNullable(m => m.deBirthDate, "d", new { dataBind = "attr: { disabled: shouldBeReadonlyObservable }, value: birthDateValue, validation: { valid: birthDateValue}" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltGender%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cbGender, this.PatientEditController.GendersSource, "gen_GenderID", "gen_GenderName", true, new { dataBind = "zpSelect: { bindType: 'id', captionText: '-', enableSearch: false, disabled: shouldBeReadonlyObservable() }" })%>
							                    </span>
							                    <asp:Image ID="GenderRequiredField" Visible="false" CssClass="validation-failed-image" ImageUrl="~/Styles/Default/Images/Error.gif" 
									                       ImageAlign="Right" runat="server" ToolTip="This field is required!" />
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltMaritialState%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cmMaritalState, this.PatientEditController.MaritialStatesSource, "marsta_MaritalStateID", "marsta_MaritalStateName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltPhoneNumber%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbPhoneNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltPhoneNumberSecond%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbMobileNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltEmailAddress %></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbEmailAddress, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltStreetName%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbStreetName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltStreetNumber%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbStreetNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltPostalCode%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbPostalCode, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
					                    </div>
					                    <%-- Form Sections Split --%>
					                    <div class="form-table-column">
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltCity%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbCity, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltLocality%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m=>m.tbLocality, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" }) %>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltState%></label>
							                    <span class="input-field">
								                    <%= this.TextBox(m => m.tbState, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltCountry%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cbCountry, this.PatientEditController.CountriesSource, "con_CountryID", "con_CountryName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltMobility%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cbMob, this.PatientEditController.MobilitiesSource, "mob_MobilityID", "mob_MobilityName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltWard%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cbWards, this.PatientEditController.WardsSource, "war_WardID", "war_WardName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
							                    </span>
						                    </div>
						                    <div class="form-table-row">
							                    <label class="form-table-label"><%: WebResources.ltHistoryLocation%></label>
							                    <span class="input-field">
								                    <%= this.ComboBox(m => m.cbHistoryLocation, this.PatientEditController.HistoryLocationsSource, "hisloc_HistoryLocationID", "hisloc_HistoryLocationName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
							                    </span>
						                    </div>
					                    </div>
				                    </div>
			                    </div>
			                    <hr />
			                    <div class="ui-helper-clearfix">
		                            <h2><%: WebResources.ltObservationInformation %></h2>
		                            <asp:UpdatePanel ID="ObservationsContainer" runat="server" UpdateMode="Conditional" style="display: inline-block">
		                              <ContentTemplate>    
		                                  <div>
		                                      <span>
		                                          <asp:ListBox ID="PatientObservationsList" runat="server" Rows="6" Width="240px" SelectionMode="Multiple" cssclass="ui-input" style="height: auto; min-height: 120px">
		                                          </asp:ListBox>
		                                      </span>
		                                      <span>
		                                          <button type="button" class="btn align-top" OnServerClick="btnRemoveObservation_Click" runat="server" style="width: 100px"><%: WebResources.ltRemove %></button>
		                                      </span>
		                                  </div>
                                          <br/>
		                                  <div>
		                                      <span>
		                                          <%= this.ComboBox(m => m.cbObservation, this.AvailableObservationsSource, "obs_ObservationID", "obs_ObservationName", true, new { dataBind = "disabled: shouldBeReadonlyObservable()", style = "width: 240px", @class= "ui-input" })%>
		                                      </span>
		                                      <button id="Button1" type="button" class="btn" OnServerClick="btnAddObservation_Click" runat="server" style="width: 100px"><%: WebResources.General_AddButton %></button>
		                                  </div>
		                                </ContentTemplate>
		                            </asp:UpdatePanel>
		                        </div>
			                    <hr />
			                    <div class="ui-helper-clearfix">
				                    <h2><%: WebResources.ltGeneralPhysicianInformation %></h2>
				                    <asp:UpdatePanel ID="GeneralPractitionerContainer" data-bind="with: editPatientViewModel" runat="server" UpdateMode="Conditional">
					                    <ContentTemplate>
						                    <%-- Form Sections Start --%>
						                    <div class="form-table section">
							                    <div class="new-form-entry" id="gpSelector">
								                    <asp:Label CssClass="form-table-label" Text="<%$ Resources:WebResources, ltGeneralPhysicianName %>" runat="server" />
                                                    <%
                                                        if (this.GeneralPractitionerCanBeCHanged)
								                    { %>
                                                        <%= this.Hidden(m => m.cbGP)%>
					                                    <span class="input-field" data-bind="zpSelect: { bind: '[name=cbGP]', legacyBind: true, source: referringPhysicianSource, behavior: 'single', enableSearch: true,  captionText: locfmt('{ris,EditOrder_SelectPhysician}'), selectedID: referringPhysician }">
                                                        </span>
								                    <% }
									                    else
									                    {
								                    %>
                                                        <span class="input-field"><%: this.Model.txGP %></span>
								                    <% } %>
							                    </div>
						                    </div>
					                    </ContentTemplate>
				                    </asp:UpdatePanel>
			                    </div>
			                    <hr />
			                    <div class="ui-helper-clearfix">
				                    <h2><%: WebResources.ltGeneralPractitionerPracticeInformation %></h2>
				                    <asp:UpdatePanel ID="GeneralPractitionerPracticeContainer" runat="server" UpdateMode="Conditional">
					                    <ContentTemplate>
						                    <div class="form-table">
						                        <div class="form-table-row">
							                        <asp:Label CssClass="form-table-label" ID="lblGPPDescription" runat="server" Text="<%$ Resources:WebResources, ltPracticeDescription %>"></asp:Label>
							                        <span class="input-field">
								                        <%: this.Model.txGPPDescription %>
							                        </span>
						                        </div>
						                        <div class="form-table-row">
							                        <asp:Label CssClass="form-table-label" ID="lblGPPCode" runat="server" Text="<%$ Resources:WebResources, ltPracticeCode %>"></asp:Label>
							                        <span class="input-field">
								                        <%: this.Model.txGPPCode %>
							                        </span>
						                        </div>
						                        <div class="form-table-row">
							                        <asp:Label CssClass="form-table-label" ID="lblGPPCCGCode" runat="server" Text="<%$ Resources:WebResources, ltPracticeCCGCode %>"></asp:Label>
							                        <span class="input-field">
								                        <%: this.Model.txGPPCCGCode %>
							                        </span>
						                        </div>
						                    </div>
						                    <%-- Form Sections End --%>
					                    </ContentTemplate>
				                    </asp:UpdatePanel>
			                    </div>
			                    <hr />
			                    <div class="ui-helper-clearfix">
				                    <h2 class="new-form-caption"><%: WebResources.ltWorkLocationInformation %></h2>
				                    <asp:UpdatePanel ID="WorkLocationContainer" runat="server" UpdateMode="Conditional">
					                    <ContentTemplate>
						                    <% if (this.Model.WorkLocation != null)
						                       {  %>
						                    <div class="form-table">
						                        <div class="form-table-row">
								                    <asp:Label CssClass="form-table-label" ID="lblWLAddress" runat="server" Text="<%$ Resources:WebResources, ltAddress %>"></asp:Label>
								                    <span class="input-field">
									                    <%: this.Model.WorkLocation.worloc_Address%>
								                    </span>
							                    </div>
						                        <div class="form-table-row">
								                    <asp:Label CssClass="form-table-label" ID="lblPostalCode" runat="server" Text="<%$ Resources:WebResources, ltPostalCode %>"></asp:Label>
								                    <span class="input-field">
									                    <%: this.Model.WorkLocation.worloc_PostalCode%>
								                    </span>
							                    </div>
						                        <div class="form-table-row">
								                    <asp:Label CssClass="form-table-label" ID="lblTelephoneNumber" runat="server" Text="<%$ Resources:WebResources, ltPhoneNumber %>"></asp:Label>
								                    <span class="input-field">
									                    <%: this.Model.WorkLocation.worloc_TelephoneNumber%>
								                    </span>
							                    </div>
						                    </div>
							                    <% 
						                       } else { %>
						                       <div>
								                    <%: WebResources.NoWorklocationsFound %>
						                       </div>
						                    <% } %>
					                    </ContentTemplate>
				                    </asp:UpdatePanel>
			                    </div>
			                    <hr />
			                    <div class="ui-helper-clearfix">
				                    <h2><%: WebResources.ltInsuranceInformation%></h2>
				                    <div>
					                    <asp:UpdatePanel ID="upInsuranceCompany" runat="server">
						                    <ContentTemplate>
							                    <asp:PlaceHolder ID="phInsuranceCompany" runat="server"></asp:PlaceHolder>
						                    </ContentTemplate>
						                    <Triggers>
							                    <asp:AsyncPostBackTrigger ControlID="btnAddInsuranceCompany" EventName="ServerClick" />
							                    <asp:AsyncPostBackTrigger ControlID="btnRemoveInsuranceCompany" EventName="ServerClick" />
						                    </Triggers>
					                    </asp:UpdatePanel>
				                    </div>
				                    <div>
                                        <button type="button" class="btn" ID="btnAddInsuranceCompany" runat="server"><%: WebResources.PatientsPage_Insurance_AddCompanyButton %></button>
					                    <button type="button" class="btn" ID="btnRemoveInsuranceCompany" runat="server"><%: WebResources.PatientsPage_Insurance_RemoveCompanyButton %></button>
				                    </div>
			                    </div>
		                    </ContentTemplate>
	                    </asp:UpdatePanel>
                    </div>
		            <%-- The Admission History Tab --%>
                    <div id="AdmissionHistoryTab" class="cloak" data-bind="with: admissionHistoryViewModel" zp-fluids="fixed" style="white-space: nowrap" >
			            <div class="form-margin">
				            <div id="AdmissionHistoryGridView" class="panel-border ui-corner-top" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,PatientAdmissionHistoryGrid_LoadingOverlay}'), show: isLoading(), delay: 10 }" style="height:300px">
				            </div>
			            </div>
		            </div>
		            <%-- The Next of Kin Tab --%>
                    <div id="NextOfKinTabPanel" class="cloak" zp-fluids="fixed" style="white-space: nowrap" >
			            <div id="NextOfKinTabPanelContent" data-bind="with: readOnlyVM" class="form-margin new-form">
				            <asp:UpdatePanel ID="upNextOfKin" UpdateMode="Conditional" runat="server">
					            <ContentTemplate>   
					            <%-- The Personal Information Group --%>
					            <div class="form-table ui-helper-clearfix">
						            <%-- Form Sections Start --%>
						            <div class="form-table-column">
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_LastName" runat="server" Text="<%$ Resources:WebResources, ltLastName %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_LastName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_Prefix" runat="server" Text="<%$ Resources:WebResources, ltPrefix %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_Prefix, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_FirstName" runat="server" Text="<%$ Resources:WebResources, ltFirstName %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_FirstName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_MiddleNameLabel" runat="server" Text="<%$ Resources: WebResources, PatientInformation_MiddleNameLabel %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_MiddleName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_PartnerName" runat="server" Text="<%$ Resources:WebResources, ltPartnerName %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_PartnerName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_PartnerPrefix" runat="server" Text="<%$ Resources:WebResources, ltPartnerPrefix %>" />
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_PartnerPrefix, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
						            </div>
						            <%-- Form Section Split --%>
						            <div class="form-table-column">
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_DateOfBirth" runat="server" Text="<%$ Resources:WebResources, ltDateOfBirth %>"></asp:Label>
								            <span class="input-field">
									            <%= this.DatePickerNullable(m => m.nok_DateOfBirth, "d", new { dataBind = "disabled: shouldBeReadonlyObservable" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_Gender" runat="server" Text="<%$ Resources:WebResources, ltGender %>"></asp:Label>
								            <span class="input-field">
									            <%= this.ComboBox(m => m.nok_Gender, this.PatientEditController.GendersSource, "gen_GenderID", "gen_GenderName", true, new { dataBind = "zpSelect: { bindType: 'id', enableSearch: false, captionText: '-', disabled: shouldBeReadonlyObservable() }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_MaritialState" runat="server" Text="<%$ Resources:WebResources, ltMaritialState %>"></asp:Label>
								            <span class="input-field">
									            <%= this.ComboBox(m => m.nok_MaritialState, this.PatientEditController.MaritialStatesSource, "marsta_MaritalStateID", "marsta_MaritalStateName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_PhoneNumber" runat="server" Text="<%$ Resources:WebResources, ltPhoneNumber %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_PhoneNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_MobileNumber" runat="server" Text="<%$ Resources:WebResources, ltPhoneNumberSecond %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_MobileNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
						            </div>
						            <%-- Form Sections Split --%>
						            <div class="form-table-column">
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_StreetName" runat="server" Text="<%$ Resources:WebResources, ltStreetName %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_StreetName, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_StreetNumber" runat="server" Text="<%$ Resources:WebResources, ltStreetNumber %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_StreetNumber, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_PostalCode" runat="server" Text="<%$ Resources:WebResources, ltPostalCode %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_PostalCode, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_Locality" runat="server" Text="<%$ Resources:WebResources, ltLocality %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_Locality, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_City" runat="server" Text="<%$ Resources:WebResources, ltCity %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_City, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_State" runat="server" Text="<%$ Resources:WebResources, ltState %>"></asp:Label>
								            <span class="input-field">
									            <%= this.TextBox(m => m.nok_State, new { dataBind = "attr: { readonly: shouldBeReadonlyObservable }" })%>
								            </span>
							            </div>
							            <div class="form-table-row">
								            <asp:Label CssClass="form-table-label" ID="nok_Country" runat="server" Text="<%$ Resources:WebResources, ltCountry %>"></asp:Label>
								            <span class="input-field">
									            <%= this.ComboBox(m => m.nok_Country, this.PatientEditController.CountriesSource, "con_CountryID", "con_CountryName", true, new { dataBind = "zpSelect: { disabled: shouldBeReadonlyObservable(), enableSearch: false, captionText: '-' }" })%>
								            </span>
							            </div>
						            </div>
					            </div>
					            </ContentTemplate>
				            </asp:UpdatePanel>
			            </div>
		            </div>
		            <hr/>
		            <div>
			            <RISC:JQueryButton ID="btnAbort" runat="server" Text="<%$ Resources:WebResources, General_AbortButton %>"
								            OnClientClick="ZillionRis.GoBackToPreviousPage();" AutoPostBack="false" CausesValidation="false">
			            </RISC:JQueryButton>
			            <span class="right">
				            <RISC:JQueryButton ID="btnPatientDocuments" runat="server" Text="Documents" AutoPostBack="false" OnClientClick="window.showPatientDocuments()" />
				            <RISC:JQueryButton ID="btnConfirm" runat="server" Text="<%$ Resources:WebResources, General_ConfirmButton%>" AutoPostBack="true" 
									            OnClick="BtnSavePatient_Click" OnClientClick="if (!ValidateForm()) { return false; }" />
			            </span>
		            </div>
	            </div>
	        </div>
	    </div>
	</div>
</asp:content>
