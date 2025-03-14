<%@ Page Title="Service Support" Language="C#" MasterPageFile="~/LowProfileMaster.master" AutoEventWireup="false" CodeBehind="Service.aspx.cs" Inherits="Rogan.ZillionRis.Website.Service" %>
<%@ Import Namespace="Rogan.ZillionRis.Extensibility.Security" %>
<%@ Import Namespace="Rogan.ZillionRis.Statistics" %>
<%@ Import Namespace="ZillionRis.Common" %>
<%@ Register TagPrefix="RISC" Namespace="Rogan.ZillionRis.WebControls.Common" Assembly="Rogan.ZillionRis.WebControls" %>
<asp:Content ID="Content1" ContentPlaceHolderID="HeadContent" runat="server">
	<style>
		#VersionInformation {
			width: 400px;
		}
		#VersionInformation th {
			font-weight: inherit;
		}
	</style>
    <script>
        $(window).on('unload', function() { InternetExplorerPlugin.Close(); });
        function GenerateWorkloadSQL() {
            var $content = $('#Content');
            $content.loadingOverlay();
            $content.loadingOverlay({ messageClass: '', message: '<span>This may take a while<br/>Between 10 seconds and 1 minute ...</span>', delay: 0, showOverlayAfter: 0 });
            $content.loadingOverlay('show');
            Modules.Task('module://performance/task/sql-workload', 'request').then(function(x) {
                var text = $('<textarea style="z-index: 9999; position: fixed; left: 0; top: 0; width: 800px; height: 400px"/>');
                text.val(x.Sql);
                text.appendTo('body');
            }, function(x) {
                var text = $('<textarea style="z-index: 9999; position: fixed; left: 0; top: 0; width: 800px; height: 400px"/>');
                text.val(x.message);
                text.appendTo('body');
            }).always(function () {
                $content.loadingOverlay('hide');
            });
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="StandaloneContent" runat="server"></asp:Content>
<asp:Content ID="Content4" ContentPlaceHolderID="MainContent" ClientIDMode="Static" runat="server">
	<RISC:GroupPanel ID="DiagnosePanel" Title="Diagnose Pages" CssClass="no-scroll" runat="server">
	    <ul style="list-style: disc; margin: 0.5em 2em; font-size: 16px">
	        <li><a href="<%= this.ResolveClientUrl("~/p/health-check") %>">Health Check</a></li>
	        <li><a href="<%= this.ResolveClientUrl("~/Diagnose/SpeechMike.html") %>">Speech Mike</a></li>
	        <li><a href="javascript:GenerateWorkloadSQL()">Generate workload SQL</a></li>
	        <li><a href="javascript:InternetExplorerPlugin.Open('http://www.google.com/')">Internet Explorer Plugin</a></li>
	        <li><a href="javascript:RunEchoTest()">Script Server - Echo Test</a></li>
        </ul>
    </RISC:GroupPanel>
    <br/>
	<RISC:GroupPanel ID="SessionPanel" Title="Session Settings" CssClass="no-scroll" runat="server"><span>Change settings that are used during the current session.</span>
		<p class="spacing" />
		<dl class="details-list">
		    <dt>Information Level</dt>
		    <dd>The amount of detailed information that Zillion RIS gives about errors.</dd>
		    <dd>
		        <asp:UpdatePanel ID="InformationContainer" UpdateMode="Conditional" runat="server">
		            <ContentTemplate>
		                <RISC:JQueryButtonSet ID="InformationLevel" AutoPostBack="true" OnTextChanged="InformationLevel_OnTextChanged" runat="server"></RISC:JQueryButtonSet>
		            </ContentTemplate>
		        </asp:UpdatePanel>
		    </dd>	
		    <asp:PlaceHolder ID="LanguagePanel" runat="server">
		        <dt>Language</dt>
		        <dd>
		            <asp:DropDownList AutoPostBack="true" ID="Language" OnTextChanged="Language_OnSelectionChanged" runat="server" />
		        </dd>
		    </asp:PlaceHolder>
		    <asp:PlaceHolder ID="LocationPanel" runat="server">
		        <dt>Location</dt>
		        <dd>
		            <asp:DropDownList ID="LocationInput" AutoPostBack="true" OnTextChanged="Location_OnTextChanged" runat="server" />
		        </dd>
		    </asp:PlaceHolder>
		</dl>
	</RISC:GroupPanel>
    <% if (this.Application.UserHasPermission(UserPermissions.ServiceUser))
       { %>
    <br/>
	<RISC:GroupPanel ID="AdvancedSessionSettings" Title="Advanced Session Information" CssClass="no-scroll" runat="server">
		<dl class="details-list">
			<asp:PlaceHolder ID="SessionVariablesPanel" runat="server">
			    <dt>App Statistics</dt>
			    <dd>
					<asp:UpdatePanel ID="AppStatPanel" ClientIDMode="Static" UpdateMode="Always" runat="server">
						<ContentTemplate>
                            <% foreach (var record in AppStat.Extract().OrderBy(x=>x.Key)) { %>
                            <p><span><%= record.Counter %></span> <span><%= record.Key %></span></p>
                            <% } %>
						</ContentTemplate>
					</asp:UpdatePanel>
			    </dd>
			</asp:PlaceHolder>
		</dl>
	</RISC:GroupPanel>
    <br/>
	<RISC:GroupPanel ID="ExceptionPanel" Title="Debugging Errors" CssClass="no-scroll" runat="server">
		<dl class="details-list">
			<% if (RisApplication.Current.InitializationExceptions != null)
	  { %>
			<dt>Initialization Exception</dt>
			<dd>
				<div class="message-technical-details" style="margin-top: 1em">
					<span class="message-technical-details-title">Exception Details:</span>
					<div class="message-technical-details-content">
						<pre><%: RisApplication.Current.InitializationExceptions%></pre>
					</div>
				</div>
			</dd>
			<% } %>
		</dl>
	</RISC:GroupPanel>
	<% } %>
    <br/>
	<RISC:GroupPanel ID="ModulesPanel" Title="IIS Module Information" CssClass="no-scroll" runat="server">
		<dl class="details-list">
		    <% foreach (var module in ApplicationInstance.Modules.AllKeys)
		       {
		           var x = ApplicationInstance.Modules.Get(module);
%>
			<dt><%: module.ToString() %></dt>
			<dd><%: x.GetType().AssemblyQualifiedName %></dd>
		       <%} %>
		</dl>
	</RISC:GroupPanel>
    <br/>
	<RISC:GroupPanel ID="SoftwarePanel" Title="Software Information" CssClass="no-scroll" runat="server">
		<dl class="details-list">
			<dt>Version Information</dt>
			<dd>
				<asp:GridView CssClass="details-table-vertical no-wrap" ID="VersionInformation" AutoGenerateColumns="false" GridLines="None" Width="50%" runat="server">
					<HeaderStyle HorizontalAlign="Left" CssClass="label" />
					<Columns>
						<asp:BoundField DataField="Title" HeaderText="Title" />
						<asp:BoundField DataField="VersionText" HeaderText="Version" />
						<asp:BoundField DataField="LinkerTime" HeaderText="Build Date" />
					</Columns>
				</asp:GridView>
			</dd>
		</dl>
	</RISC:GroupPanel>
	<% if (this.Application.UserHasPermission(UserPermissions.ServiceUser))
	{ %>
    <br/>
	<RISC:GroupPanel ID="asd" Title="Module Viewer" CssClass="no-scroll" runat="server">
		<%= this.RenderPart("~/Parts/ModuleViewer.cshtml") %>
	</RISC:GroupPanel>
	<% } %>
</asp:Content>
