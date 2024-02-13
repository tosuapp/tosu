use neon::prelude::*;
use sysinfo::System;

fn process_by_name(mut cx: FunctionContext) -> JsResult<JsValue> {
    let sys = System::new_all();
    let process_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let obj = cx.empty_object();

    for process in sys.processes_by_name(&process_name) {
        let id = cx.number(process.pid().as_u32());
        let name = cx.string(process.name().to_string());
        let cmd = cx.string(process.cmd()[0].to_string());

        let _ = obj.set(&mut cx, "pid", id);
        let _ = obj.set(&mut cx, "name", name);
        let _ = obj.set(&mut cx, "cmd", cmd);

        return Ok(obj.upcast());
    }

    Ok(cx.null().upcast())
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("process_by_name", process_by_name)?;
    Ok(())
}
