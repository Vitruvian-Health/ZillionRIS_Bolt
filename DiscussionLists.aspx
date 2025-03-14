<%@ Page Language="C#" AutoEventWireup="True" EnableEventValidation="false" EnableViewState="True" CodeBehind="DiscussionLists.aspx.cs" Inherits="ZillionRis.DiscussionLists" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content contentplaceholderid="HeadContent" runat="server">
    <CD:JsInclude FilePath="~/DiscussionLists.js" Priority="101" runat="server" />
    <style>
        #DiscussionToolBar .ui-input, #DiscussionToolBar .zpselect {
            min-width: 170px;
        }
        #ButtonsPanel .btn {
            margin-bottom: 2px;
        }
    </style>
</asp:content>
<asp:content id="Content" contentplaceholderid="MainContent" runat="Server">
    <div id="DiscussionListPage">
        <div id="ButtonsPanel" class="ui-helper-clearfix">
            <div id="DiscussionListButtons" style="display: inline-block;">
                <div data-bind="visible: PersonalDiscussionLists().length > 0"><%: WebResources.DiscussionList_PersonalLists %></div>
                <div data-bind="foreach: PersonalDiscussionLists">
                    <button class="btn" type="button" data-bind="button: {}, attr: { title: title }, text: name, click: $root.selectList, css: { 'checked': selected }"></button>
                </div>
                <div data-bind="visible: PersonalDiscussionLists().length > 0 && SharedDiscussionLists().length > 0" style="height: 5px"></div>
                <div data-bind="visible: SharedDiscussionLists().length > 0"><%: WebResources.DiscussionList_SharedLists %></div>
                <div data-bind="foreach: SharedDiscussionLists">
                    <button class="btn" type="button" data-bind="button: {}, attr: { title: title }, text: name, click: $root.selectList, css: { 'checked': selected }"></button>
                </div>
            </div>
            <span id="AddDeleteButtons" style="margin-top: 17px" class="right">
                <button id="NewListButton" class="btn" type="button" data-bind="button: {}, click: addList"><%: WebResources.General_New %></button>
                <button id="DeleteListButton" class="btn" type="button" data-bind="button: {}, click: deleteList, enable: selectedWorkList"><%: WebResources.General_Delete%></button>
            </span>
        </div>
        <div id="WorkSpace" style="margin-top: 10px; position: relative">
            <div id="ListedPanel" class="ui-group-panel" title="<%: WebResources.DiscussionList_DiscussionLists %>">
                <div id="DiscussionToolBar" class="ui-helper-clearfix">
                    <span class="right">
                        <button id="CustomizeFilterButton" class="btn" type="button" accesskey="F" data-bind="button: { }, click: customizeFilter" ><%: WebResources.ReceptionLow_CustomizeFilters %></button>
                    </span>
                    <span>
                        <div><%: WebResources.ImagingPage_Filter %></div>
                        <div id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }"></div>
                    </span>
                </div>
                <div class="ui-group-panel-content no-padding">
                    <div id="ListedGridView" data-bind="virtualDataGrid: { options: gridOptions }, loadingOverlay: { message: locfmt('{ris,Discussion_LoadingDiscussionLists}'), show: isLoading(), delay: 10 }" style="height:300px">
                    </div>
                </div>
                <div class="ui-group-panel-toolbar bottom">
                    <div id="ButtonLine" class="ui-helper-clearfix">
                         <span>
                            <button id="ViewButton" class="btn" type="button" onclick="viewHistoryExaminationImage();" data-bind="button: {}, enable: hasCompletedItem()" ><%: WebResources.General_ViewButton%></button>
                            <button id="AddAddendumButton" class="btn" type="button" data-bind="button: {}, click: addAddendums, enable: hasReport() || hasMultipleSelected(), visible: hasSelection()"><%: WebResources.General_AddAddendum %></button>
                            <button id="RemoveExamsButton" class="btn" type="button" data-bind="button: {}, click: removeExaminations, visible: hasSelection()"><%: WebResources.ltRemove %></button>
                        </span>
                         <span class="right">
                            <button class="btn" type="button" onclick="addToViewer();" data-bind="button: {}, enable: hasCompletedItem(), visible: showAddButton" ><%: WebResources.General_AddButton %></button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div id ="HistoryWorkspace" style="margin-top: 10px; position: relative">
            <div id="HistoryPanel" title="<%: WebResources.ltExaminationOverview %>" class="no-padding">
                <div id="PatientHistoryGrid">
                </div>
            </div>
        </div>
    </div>
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.DiscussionList_WorkListFilters %></h1>
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
                                <tr data-bind="with: requesterLocations">
                                    <td class="label">
                                        <%: WebResources.ltRequestingLocation %>
                                    </td>
                                    <td>
                                        <input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                                        <input type="text" style="width: 98%" data-bind="jqAuto: { }, jqAutoSource: source.source, jqAutoQuery: source.query, jqAutoValue: addNew, jqAutoSourceLabel: 'label', jqAutoSourceInputValue: 'value'" class="ui-input" />
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
                    <input type="button" id="AddNewFilterButton" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <input type="button" id="DeleteFilterButton" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
                    <input type="button" id="SaveFilterButton" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />

                    <span class="right"><input type="button" id="CloseFilterButton" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
                </div>
            </div>
        </div>
    </div>
</asp:content>
