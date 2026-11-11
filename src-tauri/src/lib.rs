use tauri::{plugin::Builder as PluginBuilder, Runtime};
use tauri_plugin_opener::OpenerExt;

// The web app opens external pages with target="_blank" anchors and
// window.open(). A desktop webview has no tabs, so turn those into plain
// navigations; the navigation hook below then hands them to the system browser.
const EXTERNAL_LINKS_JS: &str = r#"
(function () {
  window.open = function (url) {
    if (url) location.href = new URL(url, location.href).href;
    return null;
  };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || e.defaultPrevented) return;
    var t = (a.getAttribute('target') || '').toLowerCase();
    if (t && t !== '_self') { e.preventDefault(); location.href = a.href; }
  }, true);
})();
"#;

fn is_app_url(url: &tauri::Url) -> bool {
    match url.scheme() {
        "http" | "https" => matches!(
            url.host_str(),
            Some("tauri.localhost") | Some("localhost") | Some("127.0.0.1")
        ),
        _ => true, // tauri://, asset:, about:, data:, blob:
    }
}

fn external_links<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    PluginBuilder::new("external-links")
        .js_init_script(EXTERNAL_LINKS_JS.to_string())
        .on_navigation(|webview, url| {
            if is_app_url(url) {
                return true;
            }
            let _ = webview.opener().open_url(url.as_str(), None::<&str>);
            false
        })
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(external_links())
        .run(tauri::generate_context!())
        .expect("error while running GOES-STAR");
}
