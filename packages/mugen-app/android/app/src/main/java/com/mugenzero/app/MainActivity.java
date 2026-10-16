package com.mugenzero.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // THE GAME'S TEXT AT THE SIZE IT WAS LAID OUT FOR (作者 2026-10-16: 実機で見切れる).
        // Android's WebView scales every CSS pixel of text by the handset's own font-size setting,
        // so on a phone set to large text the words grew past their plates and buttons and were cut.
        // The screens are drawn for their own sizes, so the text stays at 100% here.
        if (bridge != null) {
            WebView view = bridge.getWebView();
            if (view != null) view.getSettings().setTextZoom(100);
        }
    }
}
