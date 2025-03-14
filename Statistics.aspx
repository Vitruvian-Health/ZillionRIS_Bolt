<%@ Page Language="C#" EnableEventValidation="false" AutoEventWireup="True" CodeBehind="Statistics.aspx.cs"  Inherits="ZillionRis.Statistics"   %>
<%@ Import Namespace="ZillionRis.Common" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>

<asp:content id="Content1" contentplaceholderid="HeadContent" runat="server">
    <RIS:ScriptInclude ID="ScriptInclude1" Source="Statistics.js" runat="server" />
</asp:content>

<asp:content id="Content3" contentplaceholderid="MainContent" runat="server">
    <%= this.RenderView("module://statistics/view/statisticspage")%>
    
        <div id="Buttons" class="bottomshizzle" zp-fluids="fixed">
            <div>
                <button type="button" class="btn" data-bind="click: showFailedPrintsWorklist"><%: WebResources.FailedPrintsWorklist %></button>   
                <button type="button" class="btn" data-bind="click: showFailedXdsDocumentsWorklist, visible: showXdsPendingDocuments()">Failed xds documents worklist</button>
            </div>
        </div>
        <div id="FailedPrintWorklistOverview" title="<%: WebResources.FailedPrintsWorklist %>" style="display: none">
            <div class="ui-group-panel">
                <div class="ui-group-panel-header">
                    <span class="ui-group-panel-text"></span>
                </div>
                <div class="ui-group-panel-toolbar top">
                    <label><input type="checkbox" ID="FailedPrintCheckBox" data-bind="checked: enableMultiSelect" />Multiselect</label>
                </div>
                <div class="ui-group-panel-content no-padding">
                    <div class="ui-widget-content" ID="FailedPrintView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }" style="height: 400px"></div>
                </div>
            </div>        
        </div>
        <div id="FailedXdsDocumentWorklistOverview" title="Failed Xds documents worklist" style="display: none">
            <div class="ui-group-panel">
                <div class="ui-group-panel-header">
                    <span class="ui-group-panel-title"></span>
                </div>
                <div class="ui-group-panel-toolbar top">
                    <label><input type="checkbox" ID="Checkbox1" data-bind="checked: enableMultiSelect" />Multiselect</label>
                </div>
                <div class="ui-group-panel-content no-padding">
                    <div class="ui-widget-content" id="FailedXdsDocumentView" data-bind="virtualDataGrid: { options: gridOptions, singleSelect: selectedItem }" style="height: 400px"></div>
                </div>
            </div>
        </div>
   
</asp:content>

<asp:content id="Content4" contentplaceholderid="FooterContent" runat="server">
     <%= this.Include("module://statistics/script/statisticspage")%>
</asp:content>

<asp:content contentplaceholderid="StandaloneContent" runat="server">
</asp:content>