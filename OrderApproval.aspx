<%@ Page Title="" Language="C#" AutoEventWireup="true" CodeBehind="OrderApproval.aspx.cs" MasterPageFile="LowProfileMaster.master" Inherits="Rogan.ZillionRis.Website.OrderApproval" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<asp:content id="Content1" contentplaceholderid="HeadContent" runat="server">
    <CD:JsInclude FilePath="~/ScriptLibrary/zillion-ris.specialisations.js" Priority="99" runat="server" />
    <CD:JsInclude FilePath="OrderApproval.js" Priority="100" runat="server" />
    <CD:JsInclude FilePath="OrderApproval.OrdersPendingTable.js" Priority="101" runat="server" />
    <CD:JsInclude FilePath="OrderApproval.OrderExaminationsTable.js" Priority="101" runat="server" />
    <CD:JsInclude FilePath="OrderApproval.PatientHistoryTable.js" Priority="101" runat="server" />
    <style>
        #ApprovalToolBar .zpselect { min-width: 170px; }
        #SingleModeLabel { border-radius: 3px 0 0 3px; }
        #SingleModeLabel:not(.ui-state-active) { border-right: none; }
        #MultipleModeLabel { border-radius: 0 3px 3px 0; }
        #MultipleModeLabel:not(.ui-state-active) { border-left: none; }
    </style>
</asp:content>
<asp:content id="Content4" contentplaceholderid="MainContent" runat="server">
    <div style="position: relative; width: 100%; height: 800px">
        <div style="height: 390px; width: 49%; float: left; position:relative;">
            <div id="ApprovalToolBar" class="ui-helper-clearfix">
                <ul class="button-bar">
                    <li>
                        <div><%: WebResources.PageLocationFilter_WorkListLabel %></div>
                        <div id="WorklistSelect" data-bind="zpSelect: { source: worklists, behavior: 'single', captionText: locfmt('{ris,Worklist_ChooseAWorklist}'), selectID: 'id', selectText: 'name', value: currentWorklist, enableSearch: false, enableClear: false }"></div>
                    </li>
                    <li>
                        <div><%: WebResources.ImagingPage_Filter %></div>
                        <div id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }"></div>
                    </li>
                </ul>
                <ul class="button-bar right">
                    <li>
                        <input id="CustomizeFilterButton" type="button" value="<%: WebResources.ReceptionLow_CustomizeFilters %>" accesskey="F" data-bind="button: { }, click: customizeFilter" />
                    </li>
                </ul>
            </div>
            <div id="OrdersPendingPanel" class="no-padding" title="<%: WebResources.OrderApproval_OrdersPending %>">
                <div id="OrdersPendingView" style="height: 317px" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingOrders}'), show: isLoading(), delay: 2000 }"></div>
            </div>
        </div>
        <div style="height: 390px; width: 50%; float: left; margin-left: 1%; position: relative;">
            <div id="ExaminationsToolbar" class="ui-helper-clearfix">
                <ul class="button-bar">
                    <li>
                        <div id="WorkflowModes">
                            <input id="SingleMode" name="WorkflowMode" type="radio" value="single" data-bind="checked: workflowMode" /><label id="SingleModeLabel" for="SingleMode"><%: WebResources.OrderApproval_SingleMode %></label>
                            <input id="MultipleMode" name="WorkflowMode" type="radio" value="multiple" data-bind="checked: workflowMode" /><label id="MultipleModeLabel" for="MultipleMode"><%: WebResources.OrderApproval_MultipleMode %></label>
                        </div>
                    </li>
                </ul>
            </div>
            <div id="OrderExaminationsPanel" class="no-padding" title="<%: WebResources.OrderApproval_Examinations %>">
                <div id="OrderExaminationsView" style="height: 332px;" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingExaminations}'), show: isLoading(), delay: 2000 }"></div>
            </div>
        </div>
        <div style="height: 390px; width: 100%; position: absolute; left: 0; bottom: 0px">
            <div id="PatientHistoryContainer">
                <div id="PatientHistoryPanel" class="no-padding" title="<%: WebResources.PatientHistory %>">
                    <div id="PatientHistoryView" style="height: 320px" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingPatientHistory}'), show: isLoading(), delay: 2000 }"></div>
                    <div id="HistoryButtons">
                        <ul class="button-bar inline-block-clearfix">
                            <li class="right">
                                <input id="ViewButton" type="button" value="<%: WebResources.General_ViewButton %>" data-bind="button: {}, disable: !enableViewButton(), click: viewImages" />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.OrderApproval_WorkListFilters %></h1>
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
                                        <input id="NameInput" type="text"  data-bind="value: name" style="width: 98%" class="ui-input" />
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
                                <tr data-bind="with: intendedVetters">
                                    <td class="label">
                                        <%: WebResources.IntendedVetter %>
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
                            <tr data-bind="with: referralTypes">
                                <td class="label">
                                    <%: WebResources.ltReferralType %>
                                </td>
                                <td>
                                    <input type="text" style="width: 98%" data-bind="jqAuto: {}, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                <tr data-bind="with: specialisations">
                                    <td class="label">
                                        <%: WebResources.smSpecialisations %>
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
                                <tr>
                                    <td colspan="2">
                                        <hr class="inside-form" />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">
                                        <%: WebResources.WorkListFilter_DateRange %>
                                    </td>
                                    <td style="padding-right: 8px">
                                        <table width="100%">
                                            <tr>
                                                <td>
                                                    <%: WebResources.ltFrom %>
                                                </td>
                                                <td width="40%">
                                                    <input type="text" style="width: 98%" data-bind="datepicker: startDate, datepickerOptions: { }" class="ui-input" />
                                                </td>
                                                <td>
                                                    <%: WebResources.ltTo %>
                                                </td>
                                                <td width="40%">
                                                    <input type="text" style="width: 98%" data-bind="datepicker: endDate, datepickerOptions: { }" class="ui-input" />
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2">
                                        <hr class="inside-form" />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">
                                        <%: WebResources.WorkListFilter_RelativeDate%>
                                    </td>
                                    <td>
                                        <input type="text" style="width: 98%" data-bind="value: dateRange" class="ui-input" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <hr/>
                <div class="sub-page-nav-inner-bar-padding ui-helper-clearfix">
                    <input id="AddNewFilterButton" type="button"  value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <input id="DeleteFilterButton" type="button"  value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
                    <input id="SaveFilterButton" type="button" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />

                    <span class="right"><input id="CloseFilterButton" type="button"  data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
                </div>
            </div>
        </div>
    </div>
</asp:content>
