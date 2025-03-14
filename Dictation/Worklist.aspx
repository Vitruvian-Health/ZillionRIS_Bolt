<%@ Page MasterPageFile="~/LowProfileMaster.master" Language="C#" AutoEventWireup="true" CodeBehind="Worklist.aspx.cs" Inherits="Rogan.ZillionRis.Website.Dictation.Worklist" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Import Namespace="Rogan.ZillionRis.Security" %>
<%@ Import Namespace="Rogan.ZillionRis.Extensibility.Security" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<asp:content id="Content1" contentplaceholderid="HeadContent" runat="server">
    <CD:JsInclude FilePath="~/Dictation/WorkList.js" Priority="100" runat="server" /> 
    <CD:JsInclude ID="JsInclude1" FilePath="~/ScriptLibrary/zillion-ris.specialisations.js" Priority="99" runat="server" />
    <style>
        .ui-group-panel-toolbar .ui-input, .ui-group-panel-toolbar .zpselect { min-width: 170px; }
    </style>
</asp:content>
<asp:content id="Content4" contentplaceholderid="MainContent" runat="server">
    <div id="WorklistContainer" style="min-width: 600px">
        <div class="ui-group-panel" zp-fluids="fill">
            <div class="ui-group-panel-header" zp-fluids="fixed">
                <span class="ui-group-panel-title" data-bind="text: title"></span>
            </div>
            <div class="ui-group-panel-toolbar top ui-helper-clearfix" zp-fluids="fixed">
                <ul class="button-bar">
                    <li>
                        <div><%: WebResources.PageLocationFilter_WorkListLabel %></div>
                        <span id="WorklistSelect" data-bind="zpSelect: { source: worklists, behavior: 'single', captionText: locfmt('{ris,Worklist_ChooseAWorklist}'), selectID: 'id', selectText: 'name', value: currentWorklist, enableSearch: false, enableClear: false }">
                        </span>
                    </li>
                    <li>
                        <div>Filter:</div>
                        <span id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }">
                        </span>
                    </li>
                    <% if (ShowLocationFilter) { %>
                    <li data-bind="with: locationSource">
                        <div>
                            <%: WebResources.PageLocationFilter_LocationLabel %></div>
                        <span id="LocationSelect" data-bind="zpSelect: { source: locations, behavior: 'single', captionText: locfmt('{ris,Worklist_AllLocations}') + '(' + locations().length + ')', selectText: 'displayName', value: currentLocation }">
                        </span>
                    </li>
                    <% } %>
                    <li data-bind="with: locationSource">
                        <div>
                            <%: WebResources.PageLocationFilter_RoomLabel %></div>
                        <span id="RoomSelect" data-bind="zpSelect: { source: rooms, behavior: 'single', captionText: locfmt('{ris,Worklist_AllRooms}') + ' (' + rooms().length + ')', selectText: 'displayName', value: currentRoom, disabled: !enableRooms() }">
                        </span>
                    </li>
                </ul>
                <ul class="button-bar right">
                    <li>
                        <button id="CustomizeFilterButton" type="button" class="btn" data-bind="click: customizeFilter"><%: WebResources.ReceptionLow_CustomizeFilters %></button>
                    </li>
                    <% if (SessionContext.HasPermission(UserPermissions.LastAccessedExaminations)) { %>
                    <li>
                        <button id="ViewLastExaminationsButton" type="button" class="btn" data-bind="click: viewCompletedExaminations" accesskey="C"><%: WebResources.ReceptionLow_ViewLastExaminations %></button>
                    </li>
                    <% } %>
                    <% if (SessionContext.HasPermission(UserPermissions.RadiologistTaskOverview)) { %>
                    <li>
                        <button id="TaskOverviewButton" type="button" class="btn" data-bind="click: openTasksOverview" id="OverviewTasksButton" accesskey="T"><%: WebResources.DictationPage_TasksOverview %></button>
                    </li>
                    <% } %>
                    <li>
                    </li>
                    <li>
                        <button id="RefreshButton" type="button" class="btn" data-bind="click: refresh" runat="server"><%: WebResources.General_Refresh %></button>
                    </li>
                </ul>
            </div>
            <div class="ui-group-panel-content no-padding" zp-fluids="fill">
            <div id="ExaminationsView" zp-fluids="fill" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem, multiSelect: selectedItems }, loadingOverlay: { message: locfmt('{ris,LoadingWorklist}'), show: isLoading(), delay: 10 }"></div>
            </div>
            <div class="ui-group-panel-toolbar bottom ui-helper-clearfix" zp-fluids="fixed">
            <span data-bind="visible: showDictationTypes">
                <button type="button" class="btn btn-dictation-type" id="InteractiveDictationButton"><%: WebResources.ltDictateInteractive %></button>
                <button type="button" class="btn btn-dictation-type" id="TextDictationButton"><%: WebResources.ltTextDictation %></button>
            </span>

                <asp:Literal runat="server" ID="ltInteractiveDictation" Text="" />
                &nbsp;
                <button id="ConfigurationButton" type="button" class="btn" data-bind="click: showConfiguration"><%: WebResources.ltChangeDefaultConfiguration %></button>
                <button id="ClearSelectionButton" type="button" class="btn" data-bind="click: clearSelection, visible: hasMultiSelection"><%: WebResources.Dictation_ClearSelection %></button>
                <button id="MoveSelectionButton" type="button" class="btn" data-bind="click: moveSelection, visible: hasMultiSelection"><%: WebResources.Dictation_MoveToRadiologist %></button>
                <% if (HasSupervisionModule) { %>
                    <button id="AddSupervisorButton" type="button" class="btn" data-bind="click: addSupervisorToSelection, visible: hasMultiSelection, disable: addSupervisorButtonDisabled, attr: { title: addSupervisorButtonToolTip }"><%: WebResources.Dictation_SendToSupervisor %></button>
                <% } %>
                <span class="right"><button class="btn" type="button" id="OpenDictationButton"><%: WebResources.General_DetailsButton %></button></span>
                <asp:UpdatePanel ID="DictationControlsContainer" UpdateMode="Conditional" runat="server">
                    <ContentTemplate>
                        <asp:HiddenField ID="hfIntermediate" runat="server" />
                    </ContentTemplate>
                </asp:UpdatePanel>
            </div>
        </div>
    </div>
</asp:content>
<asp:content id="Content2" contentplaceholderid="StandaloneContent" runat="server">
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.Dictation_WorkListFilters %></h1>
            <div class="sub-page-nav-inner-content ui-corner-all">
                <div>
                    <div class="sub-page-nav-inner-bar-padding">
                        <label><%: WebResources.ReceptionLow_SelectFilter %></label>
                        <span id="CurrentFilterSelect" style="min-width: 200px;" data-bind="zpSelect: { source: filterList, bindType: 'value', behavior: 'single', selectID: 'ko.utils.unwrapObservable(name)', selectText: 'ko.utils.unwrapObservable(name)', value: selectedFilter }"></span>
                    </div>
                    <hr/>
                    <div data-bind="if: selectedFilter" class="sub-page-nav-inner-content-padding">
                        <table class="details-table-vertical" data-bind="with: selectedFilter" style="border-collapse: collapse; table-layout: fixed; width: 100%;">
                            <colgroup>
                                <col style="width: 180px"/>
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td class="label">
                                       <%: WebResources.ReceptionLow_Name %>
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
                                <tr data-bind="with: intendedReporters">
                                    <td class="label">
                                        <%: WebResources.ReceptionLow_IntendedReporters %>
                                    </td>
                                    <td>
                                        <input id="IntendedReporterInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                <tr data-bind="with: radiologists">
                                    <td class="label">
                                         <%: WebResources.WorkListFilter_Radiologist%>
                                    </td>
                                    <td>
                                        <input id="RadiologistInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                 <% if (HasSupervisionModule)
                                    { %>
                                    <tr data-bind="with: supervisors">
                                        <td class="label">
                                             <%: WebResources.WorkListFilter_Supervisor %>
                                        </td>
                                        <td>
                                            <input id="SupervisorsInput" type="text" style="width: 98%" data-bind="jqAuto: {}, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                <% } %>
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
                                            <%: WebResources.WorkListFilter_Rooms %>
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
                            <tr data-bind="with: referralTypes">
                                <td class="label">
                                    <%: WebResources.ltReferralType %>
                                </td>
                                <td>
                                    <input type="text" style="width: 98%" data-bind="jqAuto: {}, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                <tr data-bind="with: specialisations">
                                    <td class="label">
                                        <%: WebResources.smSpecialisations %>
                                    </td>                                    
                                    <td>
                                        <input id="SpecialtyInput" type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                                    <input id="StartDatePicker" type="text" style="width: 98%" data-bind="datepicker: startDate, datepickerOptions: { }" class="ui-input" />                                                
                                                </td>
                                                <td>
                                                    <%: WebResources.ltTo %>
                                                </td>
                                                <td width="40%">
                                                    <input id="EndDatePicker" type="text" style="width: 98%" data-bind="datepicker: endDate, datepickerOptions: { }" class="ui-input" />                                                
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
                                        <%: WebResources.WorkListFilter_RelativeDate %>
                                    </td>
                                    <td>
                                        <input id="DateRangeInput"  type="text" style="width: 98%" data-bind="value: dateRange" class="ui-input" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <hr/>			
                <div class="sub-page-nav-inner-bar-padding ui-helper-clearfix">
                    <input id="AddNewFilterButton" type="button" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <span data-bind="if: selectedFilter">
                        <input id="DeleteFilterButton" type="button" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="button: {}, click: deleteSelected" />
                    </span>
                    <span data-bind="if: selectedFilter">
                        <input id="SaveFilterButton"  type="button" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="button: {}, click: saveSelected" />
                    </span>
                    <input id="CloseFilterButton" type="button" class="right" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/>
                </div>
            </div>
        </div>
    </div>
</asp:content>