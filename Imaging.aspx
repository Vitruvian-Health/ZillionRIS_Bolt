<%@ Page Language="C#" EnableViewState="false" AutoEventWireup="true" CodeBehind="Imaging.aspx.cs" MasterPageFile="LowProfileMaster.master" Inherits="Rogan.ZillionRis.Website.Imaging" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
    <CD:JsInclude ID="JsInclude1" FilePath="~/Imaging.Commands.js" Priority="100" runat="server" />
    <CD:JsInclude ID="JsInclude2" FilePath="~/Imaging.js" Priority="101" runat="server" />
</asp:Content>
<asp:Content ID="Content4" ContentPlaceHolderID="MainContent" runat="server">
    <div id="ImagingPage" zp-fluids="fill">
    <div id="InDepartmentPanel" class="ui-group-panel" zp-fluids="fill">
        <div class="ui-group-panel-header" zp-fluids="fixed">
            <span class="ui-group-panel-title" data-bind="{ text: departmentVM.title }"></span>
        </div>
        <div class="ui-group-panel-toolbar top" zp-fluids="fixed">
            <div class="ui-helper-clearfix">
                <ul class="button-bar">
                    <li>
                        <div>
                            <%: WebResources.General_SelectedDate %>
                            <a id="GoToTodayLink" class="ui-link ui-link-red" data-bind="click: today, visible: !isToday()" style="float: right"><%: WebResources.General_GoToToday %></a>
                        </div>
                        <input id="DateSelect" class="ui-input" type="text" data-bind="datepicker: selectedDate, datepickerOptions: { }" />
                    </li>
                    <li>
                        <div><%: WebResources.ImagingPage_Filter %></div>
                        <div id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }">
                        </div>
                    </li>
                    <li data-bind="with: locationSource">
                        <div><%: WebResources.PageLocationFilter_RoomLabel %></div>
                        <div id="RoomSelect" data-bind="zpSelect: { source: rooms, behavior: 'single', captionText: locfmt('{ris,Worklist_AllRooms}') + ' (' + rooms().length + ')', selectText: 'displayName', value: currentRoom, disabled: !enableRooms() }">
                        </div>
                    </li>
                    <li>
                        <div><%: WebResources.ImagingPage_ArrivedPatients %>:</div>
                        <input id="ArrivedPatientsChecbox" type="checkbox" class="inline-checkbox" data-bind="checked: arrivedPatientsOnly" />
                    </li>
                </ul>
                <ul class="button-bar right">
                    <li>
                        <button id="CustomizeFilterButton" type="button" accesskey="F" data-bind="button: { }, click: customizeFilter"><%: WebResources.ReceptionLow_CustomizeFilters %></button>
                    </li>
                    <li data-bind="if: window.permissions.hasLastAccessedExaminationsPermission">
                        <button id="ViewLastExaminationsButton" type="button" accesskey="C" data-bind="button: { }, click: viewCompletedExaminations"><%: WebResources.ReceptionLow_ViewLastExaminations%></button>
                    </li>
                    <li>
                        <button id="RefreshButton" type="button" data-bind="button: { }, click: refresh"><%: WebResources.General_Refresh%></button>
                    </li>
                </ul>
            </div>
        </div>
        <div class="ui-group-panel-content no-padding" zp-fluids="fill" data-bind="with: departmentVM">
            <div id="DepartmentGrid" zp-fluids="fill" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,Imaging_LoadingArrivedPatients}'), show: isLoading(), delay: 10 }">
            </div>
        </div>
    </div>
    <div style="margin-top: 10px; position: relative" zp-fluids="fill">
        <div id="PatientsContainer" style="width: 33%; display: inline-block; vertical-align: top; margin: 0 0%" data-bind="with: inProgressVM">
            <div id="PatientsPanel" class="ui-group-panel" zp-fluids="fill" zp-fluids-height="300%">
                <div class="ui-group-panel-header" zp-fluids="fixed">
                    <span class="ui-group-panel-title" data-bind="{ text: title }"></span>
                </div>
                <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                    <div id="PatientsGrid" zp-fluids="fill" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,Imaging_LoadingPatients}'), show: isLoading(), delay: 10 }">
                    </div>
                </div>
            </div>
        </div><div id="ExaminationsContainer" style="width: 33%; display: inline-block; vertical-align: top; margin: 0 0.5%" data-bind="with: examinationsVM">
            <div id="ExaminationsPanel" class="ui-group-panel" zp-fluids="fill" zp-fluids-height="300%">
                <div class="ui-group-panel-header" zp-fluids="fixed">
                    <span class="ui-group-panel-title" data-bind="{ text: title }"></span>
                </div>
                <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                    <div id="ExaminationsGrid" zp-fluids="fill" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,Imaging_LoadingExaminations}'), show: isLoading(), delay: 10 }">
                    </div>
                </div>
                <div class="ui-group-panel-toolbar bottom ui-helper-clearfix" zp-fluids="fixed">
                    <ul class="button-bar right">
                        <li><input id="CompleteAllButton" type="button" value="<%: WebResources.ImgExamination_ExaminationsInProgress_CompleteAll %>" data-bind="button: {}, disable: disableFullOrderButtons(), click: completeAllExaminations" /></li>
                        <li><input id="SendAllButton" type="button" value="<%: WebResources.ImagingPage_SendAllToButton %>" data-bind="button: {}, disable: disableFullOrderButtons(), click: createIntermediateAllExaminations" /></li>
                    </ul>
                </div>
            </div>
        </div><div id="HistoryContainer" style="width: 33%; display: inline-block; vertical-align: top; margin: 0 0%">
            <div id="HistoryPanel" class="ui-group-panel" zp-fluids="fill" zp-fluids-height="300%">
                <div class="ui-group-panel-header" zp-fluids="fixed">
                    <span class="ui-group-panel-title" data-bind="{ text: examinationsVM.historyTitle }"></span>
                </div>
                <div class="ui-group-panel-content no-padding static-content-frame" zp-fluids="fill">
                    <div data-bind="if: $root.showOrderInfo() && examinationsVM.selectedItem()">
                        <div id="ExaminationInformation"></div>
                    </div>
                    <div data-bind="if: !$root.showOrderInfo()">
                    <div data-bind="with: $root.historyVM" style="border: none" zp-fluids="fill">
                        <div id="HistoryGrid" zp-fluids="fill" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem },loadingOverlay: { message: locfmt('{ris,Imaging_LoadingExaminations}'), show: isLoading(), delay: 10 }">
                        </div>
                    </div>
                    </div>
                </div>
            <div class="ui-group-panel-toolbar bottom ui-helper-clearfix" zp-fluids="fixed">
                <span class="left">
                    <input id="GeneralViewButton" type="button" value="<%: WebResources.General_ViewButton %>" data-bind="visible: !$root.showOrderInfo(), button: {}, disable: !historyVM.enableViewButton(), click: historyVM.viewImages" />
                </span>

                <span class="right">
                    <input id="ShowPatientHistoryButton" type="button" value="<%: WebResources.ImagingPage_ShowHistoryInformation %>" data-bind="visible: $root.showOrderInfo(), button: {disable: !inProgressVM.selectedItem() }, click: $root.toggleOrderInfo" />
                    <input id="ShowOrderInfoButton" type="button" value="<%: WebResources.ImagingPage_ShowRequestInformation %>" data-bind="visible: !$root.showOrderInfo(), button: {}, click: $root.toggleOrderInfo" />
                </span>
            </div>
            </div>
        </div>
    </div>
    </div>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="StandaloneContent" runat="server">
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.Imaging_WorkListFilters %></h1>
            <div class="sub-page-nav-inner-content ui-corner-all">
                <div>
                    <div class="sub-page-nav-inner-bar-padding">
                        <label><%: WebResources.ReceptionLow_SelectFilter %></label>
                        <span id="CustomizeFilterPageSelectFilter" style="min-width: 200px" data-bind="zpSelect: { captionText: locfmt('{ris,General_SelectItem}'), source: filterList, behavior: 'single', bindType: 'value', selectID: 'ko.utils.unwrapObservable(name)', selectText: 'ko.utils.unwrapObservable(name)', value: selectedFilter }"></span>
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
                                        <%: WebResources.ReceptionLow_Status %>
                                    </td>
                                    <td>
                                        <label>
                                            <input id="ScheduledStatus" type="checkbox" data-bind="checked: showScheduledExaminations" /><%: WebResources.ltScheduledStatus%></label>
                                        <label>
                                            <input id="InDepartmentStatus" type="checkbox" checked="checked" data-bind="checked: showInDepartmentExaminations" /> <%: WebResources.ltInDepartment %> </label>
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
                                        <input id="ModalityInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                        <input id="RoomsInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                                        <div>
                                            <div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
                                                <div style="position: relative">
                                                    <i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: value"></span> <%--<span data-bind="text: label"></span>--%>
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
                                        <input id="RequestLocationInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
                                        <div>
                                            <div data-bind="foreach: { data: list, afterAdd: $root.itemAdded }">
                                                <div style="position: relative">
                                                    <i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: value"></span> <%--<span data-bind="text: label"></span>--%>
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
                                                    <i data-bind="click: remove" class="ui-link">X</i> <span data-bind="text: value"></span> <%--<span data-bind="text: label"></span>--%>
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
