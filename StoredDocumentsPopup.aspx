<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="StoredDocumentsPopup.aspx.cs" Inherits="Rogan.ZillionRis.Website.StoredDocumentsPopup" %>

<%@ Import Namespace="Rogan.ZillionRis.StoredDocuments" %>
<%@ Import Namespace="ZillionRis.Common" %>

<!DOCTYPE html>
<html class="sub-page-nav-inner-content ui-corner-all" style="border: none; border-radius: 0; margin: 0;">

    <head>
        <title><%= StoredDocumentsLanguage.WindowTitle %></title>
        <link href="Styles/Fonts/roboto-v15-latin/roboto-v15-latin.css" rel="stylesheet" type="text/css" />
        <link href="Styles/Site.min.css" rel="stylesheet" />
        <link href="api/modules/content/storeddocuments/view" rel="stylesheet" />

        <script>
            window.ZillionRis = {
                ApiUrl: function(x) { return 'api/' + x; }
            };
        </script>
        <script src="Scripts/jquery.min.js"></script>
        <script src="Scripts/jquery-migrate.js"></script>
        <script src="Scripts/jquery-ui.min.js"></script>
        <script src="Scripts/angular.min.js"></script>
        <script src="Scripts/angular-animate.min.js"></script>
        <script src="Scripts/zillion-parts.min.js"></script>
        <script src="Scripts/moment.min.js"></script>
        <script src="Scripts/moment-with-locales.min.js"></script>
        <script src="Scripts/knockout-latest.js"></script>
        <script src="ScriptLibrary/support.js"></script>
        <script src="ScriptLibrary/zillion-ris.ng-ris-module.js"></script>
        <script src="ScriptLibrary/zillion-ris.ng-ris-ui-module.js"></script>
        <script src="ScriptLibrary/zillion-ris.knockout.js"></script>
        <script src="ScriptLibrary/zillion-ris.modules.js"></script>
        <script src="ScriptLibrary/zillion-ris.user-settings.js"></script>
        <script src="api/modules/script/storeddocuments/app"></script>
        <%= this.ScriptUrl(JavaScriptCultureUrl) %>
        <%= this.ScriptUrl(RisJSResourceUrl) %>
    </head>

    <body style="margin: 0; padding: 0; overflow: hidden;" onbeforeunload="bodyOnBeforeUnload()">

        <div class="sub-page-nav" id="Container" zp-fluids="window">
            <div class="modules-loading">
                <div class="modules-loading-text"><%= StoredDocumentsLanguage.App_OneMoment %></div>
            </div>
        </div>

        <script>
            (function() {
                window.isPopup = true;

                window.culture = '<%= Application.Language %>';
                moment.locale(window.culture || 'nl-NL');

                function getDimensions() {
                    var dim;
                    var winW = document.body.clientWidth,
                        winH = document.body.clientHeight;
                    if (!ZillionParts.Support.ie) {
                        // This is needed for Chrome.
                        // In Chrome document.body.clientWidth and document.body.clientHeight are affected by the zoom factor.
                        // We need to adjust for this in order to get the actual size of the window's content area.
                        var zoomFactorEstimation = window.outerWidth / winW;
                        if (zoomFactorEstimation < 0.95 || zoomFactorEstimation > 1.05) {
                            winW *= zoomFactorEstimation;
                            winH *= zoomFactorEstimation;
                        }
                    }

                    if (ZillionParts.Support.ie8) {
                        var winX = window.screenLeft,
                            winY = window.screenTop;
                        dim = { left: winX, top: winY, width: winW, height: winH };
                    } else {
                        var winX = window.screenX,
                            winY = window.screenY;
                        dim = { left: winX, top: winY, width: winW, height: winH };
                    }

                    return dim;
                }


                function getParameterByName(name, url) {
                    if (!url) {
                        url = window.location.href;
                    }
                    name = name.replace(/[\[\]]/g, "\\$&");
                    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                        results = regex.exec(url);
                    if (!results) return null;
                    if (!results[2]) return '';
                    return decodeURIComponent(results[2].replace(/\+/g, " "));
                }

                var initialDimensions;
                $(function() {
                    // timeout is needed because in Chrome getDimensions will not return the correct dimensions
                    // when it is called immediately after the ready event.
                    setTimeout(function() {
                        initialDimensions = getDimensions();
                    }, 1000);
                });

                window.bodyOnBeforeUnload = function() {
                    try {
                        var dim = getDimensions();
                        if (dim.height > 200 && dim.width > 200) {
                            var jsonDim = JSON.stringify(dim);
                            if (jsonDim != JSON.stringify(initialDimensions)) {
                                window.localStorage.setItem('RequestFormPopup', jsonDim);
                            }
                        }
                    } catch (ex) {
                        /* Eat. */
                        window.top.console.log('RequestForm: Persist Position: ' + ex);
                    }
                };

                $(window).on('hashchange', function() {
                    // For now just force a reload, unable to change the launch parameters at the time.
                    location.reload();
                });

                try {
                    var lauchData = getParameterByName("Id");

                    if (lauchData && (lauchData = JSON.parse(window.atob(lauchData)))) {
                        bootstrapStoredDocuments($('#Container'), function() {
                            return lauchData;
                        });
                    } else {
                        $('.modules-loading-text').text('No documents opened.');
                    }
                } catch (ex) {
                    $('.modules-loading-text').text('Unable to load the documents due to a problem');
                    throw ex;
                }

                setTimeout(function() {
                    window.focus();
                }, 1000);
            })();
        </script>

    </body>

</html>
