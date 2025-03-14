<%@ WebHandler Language="C#" Class="OpenSearch" %>

using System;
using System.Web;
using System.Xml;
using Rogan.ZillionRis.Security;

public class OpenSearch : IHttpHandler
{
	#region Properties
	protected string DisplayName
	{
		get { return "RIS Patient Search"; }
	}

	protected string LongDescription
	{
		get { return "RIS Patient Search"; }
	}

	public bool IsReusable
	{
		get { return false; }
	}
	#endregion

	#region Private Methods
	private static Uri GetClientPath(HttpContext context, string path)
	{
		return new Uri(context.Request.Url, VirtualPathUtility.ToAbsolute(path, context.Request.ApplicationPath));
	}

	private void ProcessDescriptionRequest(HttpContext context)
	{
		Uri searchUrlBase = GetClientPath(context, "~/PatientSearch.aspx");
		var searchUrl = string.Format("{0}#{{searchTerms}}", searchUrlBase);

		context.Response.ContentType = "application/opensearchdescription+xml";
		context.Response.Charset = "utf-8";
		
	    var settings = new XmlWriterSettings();
	    settings.Indent = true;
	    settings.IndentChars = "\t";
	    settings.NewLineChars = "\r\n";
	    using (var writer = XmlWriter.Create(context.Response.OutputStream, settings))
		{
			writer.WriteStartDocument();
			writer.WriteStartElement("OpenSearchDescription", "http://a9.com/-/spec/opensearch/1.1/");
			{
				writer.WriteElementString("ShortName", this.DisplayName);
				writer.WriteElementString("Description", this.LongDescription);
				writer.WriteElementString("Tags", "Zillion RIS");

				writer.WriteStartElement("Url");
				{
					writer.WriteAttributeString("type", "text/html");
					writer.WriteAttributeString("template", searchUrl);
				}
				writer.WriteEndElement();

				writer.WriteStartElement("Image");
				{
					writer.WriteAttributeString("type", "image/vnd.microsoft.icon");
					writer.WriteAttributeString("width", "16");
					writer.WriteAttributeString("height", "16");
					writer.WriteString(GetClientPath(context, "~/Styles/images/favicon.ico").ToString());
				}
				writer.WriteEndElement();
			}
			writer.WriteEndElement();
			writer.WriteEndDocument();
		}
	}
	#endregion

	#region Public Methods
	public void ProcessRequest(HttpContext context)
	{
	    context.ValidateUserIsLoggedIn();

		this.ProcessDescriptionRequest(context);
	}
	#endregion
}