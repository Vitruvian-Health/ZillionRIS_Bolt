using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace ZillionRis
{
    public partial class GetImage : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            // Get properties
            var sourceString = Request["src"];
            var widthString = Request["w"];
            var heightString = Request["h"];
            if (String.IsNullOrEmpty(sourceString)) return;

            var source = Server.MapPath(Server.UrlDecode(sourceString));
            if (!File.Exists(source)) return;

            int width, height;
            Bitmap b;
            if (Int32.TryParse(widthString, out width) &&
                Int32.TryParse(heightString, out height))
            {
                using (var image = System.Drawing.Image.FromFile(source))
                {
                    float imageW = image.Width;
                    float imageH = image.Height;
                    float wRatio = width / imageW;
                    float hRatio = height / imageH;
                    float ratio = Math.Min(wRatio, hRatio);
                    float drawW = ratio * imageW;
                    float drawH = ratio * imageH;

                    b = new Bitmap(width, height);
                    using (var g = Graphics.FromImage(b))
                    {
                        //g.FillRectangle(Brushes.White, 0, 0, width, height); // background colour
                        g.DrawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
                    }
                }
            }
            else
            {
                b = new System.Drawing.Bitmap(source);
            }
            //Save the image in the outputstream (Imagebutton)
            Response.ContentType = "image/jpeg";
            b.Save(Response.OutputStream, ImageFormat.Jpeg);
            b.Dispose();
        }
    }
}
