<%@ Page Title="" Language="C#" MasterPageFile="~/LowProfileMaster.master" AutoEventWireup="true" CodeBehind="Housekeeping.aspx.cs" Inherits="Rogan.ZillionRis.Website.Housekeeping" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
	<CD:JsInclude FilePath="~/Housekeeping.js" Priority="100" runat="server" /> 
</asp:Content>
<asp:content ID="Content3" contentplaceholderid="StandaloneContent" runat="server">
    <style>
        #WorkListToolBar .ui-input, #WorkListToolBar .zpselect{ min-width: 170px;}
    </style>
</asp:content>
<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">
	<div id="WorkListContainer">
	    <div id="WorkListToolBar">
			<span class="right">
			    <input id="CustomizeFilterButton" type="button" value="<%: WebResources.ReceptionLow_CustomizeFilters %>" accesskey="F" data-bind="button: { }, click: customizeFilter" />
				<input id="RefreshButton" type="button" value="<%: WebResources.General_Refresh %>" data-bind="button: { }, click: refresh" />
			</span>
			<span>
				<div><%: WebResources.ImagingPage_Filter %></div>
                <span id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }"></span>
			</span>
	    </div>
	    <div id="WorkListPanel" class="no-padding" title="<%: WebResources.htReception %>">
		    <div id="ExaminationsView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,Housekeeping_RetrievingExaminations}'), show: isLoading(), delay: 200 }"></div>
	    </div>
	</div>
    <div id="FilterDialog" >
		<div class="sub-page-nav-half-width">
			<h1 class="sub-page-nav-title section-title"><%: WebResources.Housekeeping_WorkListFilters %></h1>
			<div class="sub-page-nav-inner-content ui-corner-all">
				<div class="inline-block-clearfix">
					<div class="sub-page-nav-inner-bar-padding">
                        <label><%: WebResources.ReceptionLow_SelectFilter %></label>
						<span style="min-width: 200px" data-bind="zpSelect: { captionText: locfmt('{ris,General_SelectItem}'), source: filterList, behavior: 'single', bindType: 'value', selectID: 'ko.utils.unwrapObservable(name)', selectText: 'ko.utils.unwrapObservable(name)', value: selectedFilter }"></span>
					</div>
					<hr/>
					<div data-bind="if: selectedFilter" class="sub-page-nav-inner-content-padding">
						<table class="details-table-vertical" data-bind="with: selectedFilter" style="width: 100%; table-layout: fixed; border-collapse: collapse">
							<colgroup>
								<col style="width: 180px"/>
							</colgroup>
							<tbody>
								<tr>
									<td class="label">
										<%: WebResources.ReceptionLow_Name%>
									</td>
									<td>
										<input id="NameInput" type="text" data-bind="value: name" style="width: 98%" class="ui-input" />
									</td>
								</tr>
                                <tr>
							        <td colspan="2">
								        <hr class="inside-form" />
							        </td>
						        </tr>
						        <tr>
							        <td class="label">
								        <%: WebResources.ReceptionLow_Status%>
							        </td>
							        <td>
								        <label>
									        <input type="checkbox" data-bind="checked: showWaitingExaminations" /><%: WebResources.ReceptionLow_ExaminationType_Waiting%></label>
								        <label>
									        <input type="checkbox" data-bind="checked: showApprovedExaminations" /><%: WebResources.ReceptionLow_ExaminationType_Approved%></label>
								        <label>
									        <input type="checkbox" data-bind="checked: showScheduledExaminations" /><%: WebResources.ReceptionLow_ExaminationType_Scheduled%></label>
								        <label>
									        <input type="checkbox" data-bind="checked: showInDepartmentExaminations" /><%: WebResources.ReceptionLow_ExaminationType_InDepartment%></label>
							        </td>
						        </tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: operators">
									<td class="label">
										<%: WebResources.ReceptionLow_Operators %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: reporters">
									<td class="label">
										<%: WebResources.ReceptionLow_Reporters %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: requestingResponsibleConsultants">
									<td class="label">
										<%: WebResources.ReceptionLow_RequestingResponsibleConsultants %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: intendedReporters">
									<td class="label">
										<%: WebResources.ReceptionLow_IntendedReporters %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: modalityTypes">
									<td class="label">
										<%: WebResources.WorkListFilter_ModalityType %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: rooms">
									<td class="label">
										<%: WebResources.ReceptionLow_Rooms %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: value"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: examinationTypes">
									<td class="label">
										<%: WebResources.ReceptionLow_ExaminationTypes %>
									</td>
									<td>
										<input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value', jqAutoSourceCode: 'code'" class="ui-input" />
										<div>
											<div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
												<div style="position: relative">
													<i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: label"></span>
												</div>
											</div>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="2">
										<hr class="inside-form" />
									</td>
								</tr>
								<tr data-bind="with: urgencies">
                                    <td class="label">
                                        <%: WebResources.Urgency %>
                                    </td>
                                    <td>
                                        <input id="UrgencyInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                                        <div>
                                            <div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
                                                <div style="position: relative">
                                                    <i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: value"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
							</tbody>
						</table>
					</div>
				</div>
				<hr/>			
                                <div class="sub-page-nav-inner-bar-padding ui-helper-clearfix">
					<input id="AddNewFilterButton" type="button" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
					<input id="DeleteFilterButton" type="button" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
					<input id="SaveFilterButton" type="button" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />

					<span class="right"><input id="CloseFilterButton" type="button" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
				</div>
			</div>
		</div>
	</div>
</asp:Content>