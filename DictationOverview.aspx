<%@ Page Language="C#" AutoEventWireup="true"
	Inherits="ZillionRis.DictationOverview" CodeBehind="DictationOverview.aspx.cs" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>

<asp:Content ContentPlaceHolderID="HeadContent" runat="Server">
	<CD:JsInclude ID="JsInclude1" FilePath="~/DictationOverview.js" Priority="101" runat="server" />
 
	<CD:CssInclude ID="CssInclude1" FilePath="~/Styles/SpeechRecorder.css" Priority="10" runat="server" /> 
</asp:Content>
<asp:Content ID="Content" ContentPlaceHolderID="MainContent" runat="Server">
    <div id="MainPanel" data-bind="css: getPanelCss()" zp-fluids="fill">
        <div id="LeftPanel" zp-fluids="fill" zp-fluids-height="height*2">
            <div id="InterActiveControl" data-bind="with: iaTranscription">
                <div>
                    <div zp-fluids="fixed" data-bind="visible: isLoading()" style="text-align: center">
                        <i style="display: inline-block; vertical-align: middle; margin-right: 8px;" data-bind="roganLoading: isLoading"></i> <span>Loading dictation ...</span>
                    </div>
                    <div data-bind="visible: error()" style="text-align: center" zp-fluids="fixed" class="disable-selection transcription-error">
                        <div class="transcription-error-message">
                            <i class="icon-error" style="display: inline-block"></i> <span data-bind="text: error()"></span>
                        </div>
                        <div class="transcription-error-controls">
                            <button type="button" class="btn" data-bind="click: clearError"><%: WebResources.General_OkButton%></button>
                        </div>
                    </div>
                    <div data-bind="visible: hasAudio()" style="text-align: center" zp-fluids="fixed" class="disable-selection">
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
                        <textarea id="AuthorizationEditor" disabled="true" clientidmode="Static"  class="report-input report-input-low-contrast" data-bind="value: text, valueUpdate: 'afterkeydown'" zp-fluids="fill"></textarea>
                    </div>
                    <div class="text-controls-bottom" data-bind="visible: !showText() && space() > 1" zp-fluids="fixed">
                        <div class="text-controls disable-selection">
                            <a class="ui-link" data-bind="click: smallSpace, css: { active: space() == 1 }"><%: WebResources.Authorization_RestoreDefaultSize%></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="RightPanel" zp-fluids="fill" zp-fluids-height="height*2">
	        <div id="TranscriptionGridContainer">
	            <div id="InnerTranscriptionContainer">
                    <div id="RightTopPanel">
                        <div id="TranscriptionGridPanel" class="ui-group-panel" zp-fluids="fill">
                             <div class="ui-group-panel-header" zp-fluids="fixed">
                                <span class="ui-group-panel-title">
                                    <i style="display: inline-block; margin-right: 8px; vertical-align: middle;" data-bind="roganLoading: isLoading"></i> 
                                    <span data-bind="text: worklistTitle"></span>
                                </span>
                            </div>
		                    <div class="ui-group-panel-content no-padding" zp-fluids="fill">
			                    <div id="DictationOverviewGridView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }, loadingOverlay: { message: locfmt('{ris,Dictation_LoadingDictations}'), show: isLoading(), delay: 10 }" zp-fluids="fill">
			                    </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>
