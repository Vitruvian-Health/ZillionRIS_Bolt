using System;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using DelftDI.Common.RIS.Common;
using RazorEngine.Templating;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Web.Runtime;
using Rogan.ZillionRis.Web.Shared;

namespace ZillionRis.Common
{
    public static class ModulePageExtensions
    {
        public static string Include(this Control page, string moduleUri)
        {
            var uri = new Uri(moduleUri);
            var url =
                page.ResolveClientUrl(string.Format("~/api/modules/script/{0}/{1}", uri.Host,
                    Path.GetFileName(uri.AbsolutePath)));
            return "<script src=\"" + HttpUtility.HtmlAttributeEncode(url) + "\"></script>";
        }

        public static string ScriptUrl(this Control page, string url)
        {
            url = page.ResolveClientUrl(url);
            return "<script src=\"" + HttpUtility.HtmlAttributeEncode(url) + "\"></script>";
        }

        public static string ScriptContent(this Control page, string content)
        {
            return "<script>"+ content + "</script>";
        }

        public static string Style(this Control page, string moduleUri)
        {
            var uri = new Uri(moduleUri);
            var url =
                page.ResolveClientUrl(string.Format("~/api/modules/content/{0}/{1}", uri.Host,
                    Path.GetFileName(uri.AbsolutePath)));
            return "<link rel=stylesheet href=\"" + HttpUtility.HtmlAttributeEncode(url) + "\" />";
        }

        public static string RenderView(this Control page, string moduleUri)
        {
            try
            {
                var sessionContext = RisApplication.Current.GetSessionContext();

                var uri = new Uri(moduleUri);
                var moduleContext = sessionContext.Get<ModuleContext>();
                if (moduleContext != null)
                {
                    var viewDefintion = moduleContext.ViewActivator.View(new Intent() { Component = uri.ToString() });
                    if (viewDefintion != null)
                    {
                        var stream = viewDefintion.GetStream();
                        if (stream != null)
                            return new StreamReader(stream).ReadToEnd();
                        throw new ApplicationException("No stream associated with the view: " + uri + ".");
                    }
                    throw new ApplicationException("View not found: " + uri + ".");
                }
                throw new ApplicationException("No module manager found.");
            }
            catch (TemplateCompilationException ex)
            {
                throw new Exception(
                    "Template compilation error: " + ex.Errors.Select(x => x.ErrorText).JoinText("\r\n"), ex);
            }
        }
    }
}