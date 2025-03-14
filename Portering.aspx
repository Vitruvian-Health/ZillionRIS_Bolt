<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Portering.aspx.cs" Inherits="ZillionRis.Portering" %>
<%@ Import Namespace="Rogan.ZillionRis.Website.App_GlobalResources" %>
<%@ Register TagPrefix="CD" Namespace="ClientDependency.Core.Controls" Assembly="ClientDependency.Core" %>
<asp:content contentplaceholderid="HeadContent" runat="server">
	<CD:JsInclude FilePath="~/Portering.js" Priority="100" runat="server" /> 
</asp:content>
<asp:content id="Content3" contentplaceholderid="MainContent" runat="server">
<div id="PorteringPage">
    <div id="PorteringToolBar">
        <ul class="button-bar inline-block-clearfix">
            <li>
				<div>
					<%: WebResources.General_SelectedDate %>
					<a class="ui-link ui-link-red" data-bind="click: today, visible: !isToday()" style="float: right"><%: WebResources.General_GoToToday %></a>
				</div>
				<input class="ui-input" type="text" data-bind="datepicker: selectedDate" />
			</li>
        </ul>
    </div>

	<div id="WorkListPanel" class="no-padding" title="<%: WebResources.htReception %>">
		<div id="ExaminationsView"></div>
	</div>
	</div>
</asp:content>
