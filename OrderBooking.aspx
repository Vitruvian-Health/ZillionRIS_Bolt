<%@ Page Title="" Language="C#" AutoEventWireup="true" CodeBehind="OrderBooking.aspx.cs" Inherits="ZillionRis.OrderBooking" %>
<%@ Import Namespace="ZillionRis.Common" %>
<%@ Import Namespace="ZillionRis.Controls" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content id="Content1" contentplaceholderid="HeadContent" runat="server">
    <%= this.Include("module://workflow/script/schedulenow") %>
    <CD:JsInclude FilePath="OrderBooking.js" Priority="100" runat="server" />
    <CD:JsInclude FilePath="~/ScriptLibrary/zillion-ris.specialisations.js" Priority="99" runat="server" />

    <style>
        #PendingToolBar .ui-input, #PendingToolBar .zpselect { min-width: 170px; }

        .details-frame { font-size: 13px; line-height: 1.2em }

        .no-schedule-found { color: #888; }
    </style>
    <%= this.Script("module://reception/script/schedule") %>
    <div style="display: none">
        <div style="cursor: pointer" id="HoldDateTemplate" class="zp-inputex data-ignored" tabindex="-1">
            <div style="cursor: pointer; margin: 1px;" preview>
                <span data-bind="text: holdUntilString(), click: changeHeldOrder"> </span>
            </div>
            <div style="margin: 1px" editor>
                <div style="float: left" autosize>
                    <span data-bind="text: holdUntilString(), click: changeHeldOrder"></span>                
                </div>				
            </div>
        </div>
    </div>
</asp:content>
<asp:content id="Content4" contentplaceholderid="MainContent" runat="server">
    <div zp-fluids="fill" zp-fluids-height="120%">
        <div id="OrdersPendingDiv" style="display: inline-block; vertical-align: top; width: 49.5%;" zp-fluids="fill" zp-fluids-height="200%">
            <div id="OrdersPendingPanel" class="ui-group-panel" zp-fluids="fill">
                <div id="OrdersPendingPanelHeader" class="ui-group-panel-header" zp-fluids="fixed">
                    <span class="ui-group-panel-title"><i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i> <span data-bind="text: worklistTitle"></span></span>
                </div>
                <div id="PendingToolBar" class="ui-group-panel-toolbar top ui-helper-clearfix" zp-fluids="fixed">
                    <ul class="button-bar">
                        <li>                    
                            <div><%: WebResources.ImagingPage_Filter %></div>
                            <div id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }"></div>
                        </li>
                        <li style="padding-left: 15px; padding-top: 15px;">
                            <div id="WorklistTabs">
                                <input id="NormalTab" name="WorklistTab" type="radio" value="0" checked /> <label id="NormalTabLabel" for="NormalTab"><%: WebResources.Tab_NormalOrders %></label>
                                <input id="OnHoldTab" name="WorklistTab" type="radio" value="1"/> <label id="OnHoldTabLabel" for="OnHoldTab"><%: WebResources.Tab_OnHoldOrders %></label>
                            </div>
                        </li>
                    </ul>
                    <ul class="button-bar right">                
                        <li>
                            <input type="button" id="CustomizeFilterButton" value="<%: WebResources.ReceptionLow_CustomizeFilters %>" accesskey="F" data-bind="button: { }, click: customizeFilter" />
                        </li>
                        <li>
                            <input type="button" id="RefreshButton" value="<%: WebResources.General_Refresh %>" data-bind="button: { }, click: refresh" />
                        </li>
                    </ul>
                </div>
                <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                    <div id="OrdersPendingView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingOrders}'), show: isLoading(), delay: 2000 }" zp-fluids="fill">
                    </div>
                </div>
            </div>
        </div><div style="display: inline-block; margin-left: 1%; vertical-align: top; width: 49.5%;" zp-fluids="fill" zp-fluids-height="200%">
            <div id="OrderExaminationsContainer">
                <div id="OrderExaminationsPanel" class="ui-group-panel" zp-fluids="fill">
                    <div class="ui-group-panel-header" zp-fluids="fixed">
                        <span class="ui-group-panel-title"><i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i> <span data-bind="text: worklistTitle"></span></span>
                    </div>
                    <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                        <div id="OrderBookingExaminationsView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingExaminations}'), show: isLoading(), delay: 2000 }" zp-fluids="fill">
                        </div>
                    </div>
                    <div class="ui-group-panel-toolbar bottom" style="text-align: right" zp-fluids="fixed">
                        <% if (EnablePatientDetailsPage) { %>
                            <input type="button" id="EditPatientButton" value="<%: WebResources.OrderBooking_Button_EditPatient %>" data-bind="button: {}, click: editPatient" />
                        <% } %>
                        <% if (EnableManualScheduling) { %>
                            <input type="button" id="BookManualButton" value="<%: WebResources.Button_BookManually %>" data-bind="button: {}, disable: disableBooking(), click: bookOrderManually, attr: { title: tooltip()}" />
                        <% } %>
                        <% if (EnableAutomaticScheduling) { %>
                            <input type="button" id="BookDirectButton" value="<%: WebResources.Button_BookOrder %>" data-bind="button: {}, disable: disableBooking(), click: bookOrder, attr: { title: tooltip()}" />
                        <% } %>
                        <input type="button" id="BookOrderNowButton" value="<%: WebResources.Button_BookOrderNow %>" data-bind="button: {}, disable: disableBooking(), click: bookOrderNow, attr: { title: tooltip()}" />
                    </div>
                </div>
            </div>            
        </div>            
    </div>
    <div style="margin-top: 10px" zp-fluids="fill" zp-fluids-height="80%">
        <div class="details-frame" style="box-sizing: border-box; display: inline-block; vertical-align: top; width: 49.5%;" zp-fluids="fill" zp-fluids-height="300%">
            <div class="inner-frame" zp-fluids="fill">
                <span class="frame-title" zp-fluids="fixed"> <%: WebResources.OrderBooking_OrderDetails %> </span>
                <div class="content-frame" zp-fluids="fill">
                    <div style="font-size: 100%; height: 200px; overflow: auto; padding: 0em 1.0em;" zp-fluids="fill">
                        <div id="OrderDetails"></div>
                    </div>
                </div>
            </div>
        </div><div class="details-frame" style="box-sizing: border-box; display: inline-block; margin: 0 1%; vertical-align: top; width: 28.5%;" zp-fluids="fill" zp-fluids-height="300%">
                  <div class="inner-frame" zp-fluids="fill">
                      <span class="frame-title" zp-fluids="fixed"> <%: WebResources.OrderBooking_ExaminationInformation %> </span>
                      <div class="content-frame" zp-fluids="fill">
                          <div style="font-size: 100%; height: 200px; overflow: auto; padding: 0em 1.0em;" zp-fluids="fill">
                              <div id="ExaminationInformation">                                        
                              </div>
                          </div>
                      </div>
                  </div>
              </div><div class="details-frame" style="box-sizing: border-box; display: inline-block; vertical-align: top; width: 20%;" zp-fluids="fill" zp-fluids-height="300%">
                        <div class="inner-frame" zp-fluids="fill">
                            <span class="frame-title" zp-fluids="fixed"><%: WebResources.EditOrder_LocationsHeader %></span>
                            <div class="content-frame" zp-fluids="fill">
                                <div style="height: 200px; overflow: auto; padding: 0em 1.0em;" zp-fluids="fill">
                                    <div id="PossibleLocations" data-bind="with: possibleLocations" zp-fluids="fill">
                                        <div data-bind="if: isLoading" style="color: #888">
                                            <%: WebResources.ltCalculateSchedule %>
                                        </div>
                                        <div data-bind="with: data">
                                            <div data-bind="if: Message" style="color: #888">
                                                <span data-bind="text: Message"></span>
                                            </div>
                                            <dl class="details-list" data-bind="foreach: Locations">
                                                <dt data-bind="if: Found">
                                                    <span data-bind="text: Name"></span>
                                                </dt>
                                                <dd data-bind="if: Found">
                                                    <span data-bind="text: (Time&&moment(Time).fromNow())||'-'"></span>
                                                </dd>
                                                <dt data-bind="ifnot: Found">
                                                    <span class="no-schedule-found" data-bind="text: Name"></span>
                                                </dt>
                                                <dd data-bind="ifnot: Found">
                                                    <span class="no-schedule-found"><%: WebResources.ltNoResultsFound %></span>
                                                </dd>
                                            </dl>
                                        </div>	
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    </div>
</asp:content>
<asp:Content ID="FooterContent" ContentPlaceHolderID="FooterContent" runat="server">
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.OrderBooking_WorkListFilters %></h1>
            <div class="sub-page-nav-inner-content ui-corner-all">
                <div>
                    <div class="sub-page-nav-inner-bar-padding">
                        <label><%: WebResources.ReceptionLow_SelectFilter %></label>
                        <span style="min-width: 200px;" data-bind="zpSelect: { captionText: locfmt('{ris,General_SelectItem}'), source: filterList, bindType: 'value', behavior: 'single', selectID: 'ko.utils.unwrapObservable(name)', selectText: 'ko.utils.unwrapObservable(name)', value: selectedFilter }"></span>
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
                                <tr>
                                    <td class="label">
                                        <%: WebResources.ReceptionLow_Reporters %>
                                    </td>
                                    <td>
                                        <input type="text" style="width: 98%" readonly="readonly" class="ui-input" />
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
                                <tr>
                                    <td class="label">
                                        <%: WebResources.ReceptionLow_IntendedReporters %>
                                    </td>
                                    <td>
                                        <input type="text" style="width: 98%" readonly="readonly" class="ui-input" />
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
                                <tr data-bind="with: referralType">
                                    <td class="label">
                                        <%: WebResources.ltReferralType %>
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
                                <tr data-bind="with: functionSpecialization">
                                    <td class="label">
                                        <%: WebResources.ltFunctionSpecialisation %>
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
                                <tr data-bind="with: locations">
                                    <td class="label">
                                        <%: WebResources.ltRequestingSite %>
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
                                <tr>
                                    <td class="label">
                                        <%: WebResources.WorkListFilter_ExaminationStatuses %>
                                    </td>
                                    <td>
                                        <label>
                                            <input type="checkbox" data-bind="checked: showApprovedExaminations" /><%: WebResources.WorkListFilter_AnyApproved %></label>                                            
                                        <label>
                                            <input type="checkbox" data-bind="checked: showWaitingExaminations" /><%: WebResources.WorkListFilter_AllWaiting %></label>							        
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
                                        <%: WebResources.WorkListFilter_RelativeDate %>
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
                    <input type="button" id="AddNewFilterButton" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <input type="button" id="DeleteFilterButton" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
                    <input type="button" id="SaveFilterButton" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />

                    <span class="right"><input type="button" id="CloseFilterButton" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
                </div>
            </div>
        </div>
    </div>
</asp:Content>