<%@ Page Language="C#" AutoEventWireup="True" Inherits="Rogan.ZillionRis.Website.Authorization" CodeBehind="Authorization.aspx.cs" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>

<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content id="Content1" contentplaceholderid="HeadContent" runat="Server">
    <CD:JsInclude ID="JsInclude1" FilePath="~/ScriptLibrary/zillion-ris.specialisations.js" Priority="99" runat="server" />
    <CD:JsInclude ID="JsInclude3" FilePath="~/Authorization.js" Priority="101" runat="server" />
    
    <CD:CssInclude ID="CssInclude1" FilePath="~/Styles/SpeechRecorder.css" Priority="10" runat="server" /> 
</asp:content>
<asp:Content id="Content3" contentplaceholderid="MainContent" runat="Server">
    <div id="MainPanel" data-bind="css: getPanelCss()" zp-fluids="fill">
        <div id="LeftPanel" zp-fluids="fill" zp-fluids-height="height*2">
            <div id="InterActiveControl" data-bind="with: iaAuthorization">
                <div>
                    <div zp-fluids="fixed" data-bind="visible: isLoading()" style="text-align: center">
                        <i style="display: inline-block; vertical-align: middle; margin-right: 8px;" data-bind="roganLoading: isLoading"></i> <span>Loading dictation ...</span>
                    </div>
                    <div class="worklist-nav-controls" zp-fluids="fixed" data-bind="visible: !isLoading()">
                        <div data-bind="visible: !isOpened()">
                            <button type="button" id="StartAuthorizationButton" class="full" data-bind="click: $parent.selectedItem() ? open.bind($data, $parent.selectedItem()) : nextDictation" title="<%: WebResources.Transcription_AutoNextTooltip %>"><%: WebResources.Authorization_Open %> <i class="fa fa-fast-forward"></i></button>
                        </div>
                        <div data-bind="visible: isOpened()">
                            <button type="button" id="AuthorizeAndNextButton" class="full-34 green" data-bind="click: nextDictation" title="<%: WebResources.Authorization_AutoFinishNextTooltip %>"><%: WebResources.Authorization_NextAuthorize %><i class="fa fa-check"></i></button>
                            <button type="button" id="SkipButton" class="full-14" data-bind="click: skipDictation" title="Skip" style="color: #a00;">Skip <span>&#187;</span></button>
                            <hr/>
                            <button type="button" id="ViewImagesButton" class="full-14" data-bind="click: viewImages" title="Skip"><%: WebResources.DictationPage_ViewImages %></button>
                        </div>
                    </div>
                    <div data-bind="visible: isOpened()" zp-fluids="fixed" class="transcription-controls disable-selection">
                        <span><a id="StopButton" data-bind="click: cancel" style="color: #a00;"><%: WebResources.Authorization_Stop %></a></span>
                        <span><a id="ContinueLatterButton" data-bind="click: suspend" style="color: #008;"><%: WebResources.Authorization_ContinueLater %></a></span>
                        <span><a id="AuthorizeReportButton" data-bind="click: finish" style="color: #080;"><%: WebResources.Authorization_Authorize%></a></span>
                        <div data-bind="foreach: pluginCommands">
                           <span><a data-bind="visible: canExecute, click: execute, text: name" style="color: #000;"></a></span>
                        </div>
                    </div>
                    <div data-bind="visible: error()" style="text-align: center" zp-fluids="fixed" class="disable-selection transcription-error">
                        <div class="transcription-error-message">
                            <i class="icon-error" style="display: inline-block"></i> <span data-bind="html: error()"></span>
                        </div>
                        <div class="transcription-error-controls">
                            <button type="button" class="btn" data-bind="click: errorHousekeeping, visible: errorHousekeepingItem"><%: WebResources.smHousekeeping%></button>
                            <button type="button" class="btn" data-bind="click: clearError"><%: WebResources.General_OkButton%></button>
                        </div>
                    </div>
                    <div data-bind="visible: isOpened() && hasAudio()" style="text-align: center" zp-fluids="fixed" class="disable-selection">
                        <div class="interactive-player-controls" data-bind="css: playerCss">
                            <div><button type="button" class="red" data-bind="click: stop, css: stopCss">&#x0f049;</button> <button type="button" data-bind="click: play, css: playCss, text: playPauseIcon">&#x0f04b;</button> <button type="button" data-bind="event: { mousedown: rewind }, css: rewindCss">&#x0f04a;</button><button type="button" data-bind="event: { mousedown: forward }, css: forwardCss">&#x0f04e;</button></div>
                            <div class="position clickable" data-bind="click: positionBarClick.bind(event)">
                                <div data-bind="text: positionText"></div>

                                <div class="position-bar" data-bind="css: positionBarClasses">
                                    <div class="position-progress" data-bind="style: positionBarCss"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="ui-helper-clearfix" zp-fluids="fixed">
                        <div data-bind="visible: speechStateInfo()" class="speechstate-info disable-selection" style="float: right; text-align: right;">
                            <div><span data-bind="text: speechStateInfo() && speechStateInfo().Patient"></span></div>
                            <div><span data-bind="text: speechStateInfo() && speechStateInfo().Studies"></span></div>
                        </div>
                        <div data-bind="visible: showText()">
                            <div class="text-controls disable-selection" style="float: left">
                                <%: WebResources.Authorization_ChangeTextArea%><br/><a class="ui-link" data-bind="click: smallSpace, css: { active: space() == 1 }"><%: WebResources.Authorization_Small%></a> <a class="ui-link" data-bind="click: largeSpace, css: { active: space() == 3 }"><%: WebResources.Authorization_Large%></a>
                            </div>
                        </div>
                    </div>
                    <div data-bind="visible: showText()" zp-fluids="fill">
                        <textarea id="AuthorizationEditor" clientidmode="Static"  class="report-input report-input-low-contrast" data-bind="value: text, valueUpdate: 'afterkeydown'" zp-fluids="fill"></textarea>
                    </div>
                    <div class="text-controls-bottom" data-bind="visible: !showText() && space() > 1" zp-fluids="fixed">
                        <div class="text-controls disable-selection">
                            <a class="ui-link" data-bind="click: smallSpace, css: { active: space() == 1 }"><%: WebResources.Authorization_RestoreDefaultSize%></a>
                        </div>
                    </div>
                </div>
            </div>
        </div><div id="RightPanel" zp-fluids="fill" zp-fluids-height="height*2">
                  <div id="TranscriptionGridContainer">
                      <div id="InnerTranscriptionContainer">
                          <div id="RightTopPanel">
                              <div id="TranscriptionGridPanel" class="ui-group-panel" zp-fluids="fill">
                                  <div class="ui-group-panel-header" zp-fluids="fixed">
                                      <span class="ui-group-panel-title"><i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i> <span data-bind="text: worklistTitle"></span></span>
                                  </div>
                                  <div class="ui-group-panel-toolbar top ui-helper-clearfix" zp-fluids="fixed">
                                      <span style="display: inline-block">
                                          <div><%: WebResources.PageLocationFilter_WorkListLabel %></div>                    
                                          <span data-bind="zpSelect: { source: worklists, behavior: 'single', captionText: locfmt('{ris,Worklist_ChooseAWorklist}'), selectID: 'id', selectText: 'name', value: currentWorklist, enableSearch: false, enableClear: false }"></span>
                                      </span>    
                                      <span style="display: inline-block">
                                          <div><%: WebResources.ImagingPage_Filter%></div>
                                          <span id="FilterSelect" data-bind="zpSelect: { source: filters.source, behavior: 'single', captionText: locfmt('{ris,Worklist_None}'), selectID: 'name', selectText: 'name', selectedID: filters.selectedID }"></span>
                                      </span>
                                      <span class="dictation-type-filter" style="display: inline-block">
                                          <div><%: WebResources.ltDictationTypes %></div>
                                          <label data-bind="css: { 'inactive': dictationTypeDigitalCount() == 0 }"><input id="DictationTypeDigital" type="checkbox" data-bind="checked: dictationTypeDigital"/> <%: WebResources.ltDictateDigital%> (<span data-bind="text: dictationTypeDigitalCount"></span>)</label>
                                          <label data-bind="css: { 'inactive': dictationTypeInterActiveCount() == 0 }"><input id="DictationTypeInteractive" type="checkbox" data-bind="checked: dictationTypeInterActive"/> <%: WebResources.Authorization_InterActive%> (<span data-bind="text: dictationTypeInterActiveCount"></span>)</label>
                                          <label data-bind="css: { 'inactive': dictationTypeTextCount() == 0 }"><input id="DictationTypeText" type="checkbox" data-bind="checked: dictationTypeText"/> <%: WebResources.Authorization_FilterText%> (<span data-bind="text: dictationTypeTextCount"></span>)</label>
                                          <label data-bind="visible: dictationTypeOtherCount() > 0"><input id="DictationTypeOther" type="checkbox" data-bind="checked: dictationTypeOther"/> <%: WebResources.Authorization_Other%> (<span data-bind="text: dictationTypeOtherCount"></span>)</label>
                                      </span>
                                      <span class="dictation-type-filter" style="display: inline-block">
                                          <div><%: WebResources.ltExaminations %></div>
                                          <label data-bind="css: { 'inactive': dictationSingleExamCount() == 0 }"><input id="ExaminationsSingle" type="checkbox" data-bind="checked: dictationSingleExam"/> <%: WebResources.Authorization_Single%> (<span data-bind="text: dictationSingleExamCount"></span>)</label>
                                          <label data-bind="css: { 'inactive': dictationMultiExamCount() == 0 }"><input id="ExaminationsMultiple" type="checkbox" data-bind="checked: dictationMultiExam"/> <%: WebResources.Authorization_Multiple%> (<span data-bind="text: dictationMultiExamCount"></span>)</label>
                                      </span>
                                      <span style="float: right">
                                          <label><input id="DisableAudio" type="checkbox" data-bind="checked: disableAudio"/> <%: WebResources.Authorization_DisableAudio%></label>
                                          <label><input id="PatientHistoryCheckBox" type="checkbox" data-bind="checked: patientHistoryVisible"/> <%: WebResources.Imaging_PatientHistoryCaption%></label>
                                          <input id="CustomizeFilterButton" type="button" value="<%: WebResources.ReceptionLow_CustomizeFilters %>" accesskey="F" data-bind="button: { }, click: customizeFilter" />
                                      </span>
                                  </div>
                                  <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                                      <div id="AuthorizationGridView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,AuthorizationPage_LoadingAuthorizations}'), show: isLoading(), delay: 10 }" zp-fluids="fill">
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div id="RightBottomPanel" data-bind="visible: patientHistoryVisible">
                              <div id="PatientHistoryPanel" class="ui-group-panel" style="margin-top: 10px" data-bind="with: patientHistory" zp-fluids="fill">
                                  <div class="ui-group-panel-header" zp-fluids="fixed">
                                      <span class="ui-group-panel-title"><i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i> <span data-bind="text: worklistTitle"></span></span>
                                  </div>
                                  <div class="ui-group-panel-content no-padding" zp-fluids="fill">
                                      <div id="PatientHistoryView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,RetrievingPatientHistory}'), show: isLoading(), delay: 4000 }" zp-fluids="fill">
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
    </div>
    <div id="FilterDialog" style="display: none">
        <div class="sub-page-nav-half-width">
            <h1 class="sub-page-nav-title section-title"><%: WebResources.Authorization_WorkListFilters%></h1>
            <div class="sub-page-nav-inner-content ui-corner-all">
                <div class="inline-block-clearfix">
                    <div class="sub-page-nav-inner-bar-padding">
                        <label><%: WebResources.ReceptionLow_SelectFilter %></label>
                        <span style="min-width: 200px;" data-bind="zpSelect: { source: filterList, bindType: 'value', behavior: 'single', selectID: 'ko.utils.unwrapObservable(name)', selectText: 'ko.utils.unwrapObservable(name)', value: selectedFilter }"></span>
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
                                <tr data-bind="with: reporters">
                                    <td class="label">
                                        <%: WebResources.ReceptionLow_Reporters%>
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
                                        <%: WebResources.WorkListFilter_ModalityType%>
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
                                        <%: WebResources.ReceptionLow_Rooms%>
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
                                <tr data-bind="with: requesterLocations">
                                    <td class="label">
                                        <%: WebResources.ltRequestingLocation%>
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
                                <tr data-bind="with: specialisations">
                                    <td class="label">
                                        <%: WebResources.smSpecialisations%>
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
                                        <%: WebResources.Urgency%>
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
                                        <%: WebResources.WorkListFilter_DateRange%>
                                    </td>
                                    <td style="padding-right: 8px">
                                        <table width="100%">
                                            <tr>
                                                <td>
                                                    <%: WebResources.ltFrom%>
                                                </td>
                                                <td width="40%">
                                                    <input type="text" style="width: 98%" data-bind="datepicker: startDate, datepickerOptions: { }" class="ui-input" />                                                
                                                </td>
                                                <td>
                                                    <%: WebResources.ltTo%>
                                                </td>
                                                <td width="40%">
                                                    <input type="text" style="width: 98%" data-bind="datepicker: endDate, datepickerOptions: { }" class="ui-input" />                                                
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <hr/>			
                <div class="sub-page-nav-inner-bar-padding">
                    <input id="AddNewFilterButton" type="button" value="<%: WebResources.ReceptionLow_AddFilter %>" data-bind="button: {}, click: addNewFilter" />
                    <input id="DeleteFilterButton" type="button" value="<%: WebResources.ReceptionLow_DeleteFilter %>" data-bind="visible: selectedFilter, button: {}, click: deleteSelected" />
                    <input id="SaveFilterButton" type="button" value="<%: WebResources.ReceptionLow_SaveFilter %>" data-bind="visible: selectedFilter, button: {}, click: saveSelected" />
                    <span class="right"><input id="CloseFilterButton" type="button" data-bind="button: {}, click: close" value="<%: WebResources.ReceptionLow_Close %>"/></span>
                </div>
            </div>
        </div>
    </div>
</asp:Content>