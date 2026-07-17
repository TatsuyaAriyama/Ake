#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor へプラグインとメソッドを登録する。
// JS 側は registerPlugin('SuzakuWidget') で参照する（widgetBridge.ts）。
CAP_PLUGIN(SuzakuWidgetPlugin, "SuzakuWidget",
    CAP_PLUGIN_METHOD(update, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clear, CAPPluginReturnPromise);
)
