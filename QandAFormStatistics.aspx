<%@ Page Language="C#" EnableViewState="false" AutoEventWireup="true" CodeBehind="QandAFormStatistics.aspx.cs" Inherits="Rogan.ZillionRis.Website.QandAFormStatistics" %>
<%@ Import Namespace="ZillionRis.Common" %>

<asp:content contentplaceholderid="HeadContent" runat="server">    
    <style>
        .popup-bottom-bar  
        {
            position: absolute;
            bottom: 5px;
            left: 2px;
            right: 2px;
        }    
        
        td { padding: 1px; }
    </style>
</asp:content>

<asp:content id="Content3" contentplaceholderid="MainContent" runat="server">
    <%= this.RenderView("module://statistics/view/formreportspage")%>
</asp:content>

<asp:content id="Content4" contentplaceholderid="FooterContent" runat="server">
    <%= this.Include("module://statistics/script/formreportspage")%>
</asp:content>

<asp:content contentplaceholderid="StandaloneContent" runat="server">
</asp:content>