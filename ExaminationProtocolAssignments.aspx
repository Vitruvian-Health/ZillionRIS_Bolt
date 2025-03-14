<%@ Page Title="" Language="C#" MasterPageFile="~/LowProfileMaster.master" AutoEventWireup="true"
    CodeBehind="ExaminationProtocolAssignments.aspx.cs" Inherits="Rogan.ZillionRis.Website.ExaminationProtocolAssignments" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Import Namespace="Rogan.ZillionRis.Codes.ExaminationStatus" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
    <CD:JsInclude ID="JsInclude1" FilePath="ExaminationProtocolAssignments.js" Priority="100" runat="server" />
</asp:Content>

<asp:Content ID="Content4" ContentPlaceHolderID="MainContent" runat="server">
<style>
    .exam-status-filter label {
        margin-bottom: 0;
        margin-right: 4px;
    }
    .exam-status-filter label input {
        margin: 0;
        position: relative;
        top: 1px;
    }
</style>
<div style="position: relative; width: auto">
    <div style="width: 100%; position: absolute; left: 0; top: 0">
        <div id="ExaminationsContainer" style="width: 100%" zp-fluids="fill">
            <div id="ExaminationsToolBar" class="ui-helper-clearfix">
                <ul class="button-bar">
                    <li>
                        <div>
                            <%: WebResources.General_SelectedDate %>
                            <a id="GoToTodayLink" class="ui-link ui-link-red" data-bind="click: today, visible: !isToday()" style="float: right"><%: WebResources.General_GoToToday %></a>
                        </div>
                        <input id="DateSelect" class="ui-input" type="text" data-bind="datepicker: selectedDate" />
                    </li>
                    <li>
                        <div><%: WebResources.ImagingPage_Filter %></div>
                        <div id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }">
                        </div>
                    </li>
                    <li>
                        <label style="margin-bottom: 4px;"><%: WebResources.ExaminationProtocolAssignmentsPage_Statuses %></label>
                        <div class="exam-status-filter">
                            <label>
                                <input type="checkbox" id="ShowScheduled" data-bind="checked: filterShowScheduled" />
                                <%: ExaminationStatusValueExtensions.ToString(ExaminationStatusValue.Scheduled) %> (<span data-bind="text: filterShowScheduledCount"></span>)
                            </label>
                            <label>
                                <input type="checkbox" id="ShowInDepartment" data-bind="checked: filterShowInDepartment" />
                                <%: ExaminationStatusValueExtensions.ToString(ExaminationStatusValue.InDepartment) %> (<span data-bind="text: filterShowInDepartmentCount"></span>)
                            </label>
                            <label>
                                <input type="checkbox" id="ShowInProgress" data-bind="checked: filterShowInProgress" />
                                <%: ExaminationStatusValueExtensions.ToString(ExaminationStatusValue.InProgress) %> (<span data-bind="text: filterShowInProgressCount"></span>)
                            </label>
                        </div>
                    </li>
                </ul>
                <ul class="button-bar right">
                    <li>
                        <button type="button" id="CustomizeFilterButton" class="btn" accesskey="F" data-bind="button: {}, click: customizeFilter" ><%: WebResources.ReceptionLow_CustomizeFilters %></button>
                    </li>
                    <li>
                        <button type="button" class="btn" id="RefreshButton" data-bind="button: {}, click: refresh" ><%: WebResources.General_Refresh %></button>
                    </li>
                </ul>
            </div>
            <div id="ExaminationsPanel" class="no-padding" title="<%: WebResources.ExaminationProtocolAssignmentsPage_Examinations %>">
                <div id="ExaminationsView" data-bind="virtualDataGrid: { options: gridOptions }, loadingOverlay: { message: locfmt('{ris,RetrievingExaminations}'), show: isLoading(), delay: 2000 }">
                </div>
            </div>
        </div>
    </div>
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.ProtocolAssignment_WorkListFilters %></h1>
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
                                <tr data-bind="with: requesterLocations">
                                    <td class="label">
                                        <%: WebResources.ltRequestingLocation %>
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
                                <tr data-bind="with: intendedReporters">
                                    <td class="label">
                                        <%: WebResources.ltIntendedReporter %>
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
                                <tr data-bind="with: urgencies">
                                    <td class="label">
                                        <%: WebResources.Urgency %>
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
                                <tr>
                                    <td class="label">
                                        <%: WebResources.WorkListFilter_ScheduleDateRange %>
                                        <br/>
                                        <%: WebResources.WorkListFilter_NextXDays %>
                                    </td>
                                    <td>
                                        <input type="text" style="width: 98%" data-bind="value: nextDays" class="ui-input" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <hr/>
                <div class="sub-page-nav-inner-bar-padding ui-helper-clearfix">
                    <input type="button" id="AddNewFilterButton" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <input type="button" id="DeleteFilterButton" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
                    <input type="button" id="SaveFilterButton" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />

                    <span class="right"><input type="button" id="CloseFilterButton" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
                </div>
            </div>
        </div>
    </div>
</div>
</asp:Content>
