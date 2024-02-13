use neon::prelude::*;
use sysinfo::System;

fn process_by_name(mut cx: FunctionContext) -> JsResult<JsValue> {
    let sys = System::new_all();
    let process_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let result_array = JsArray::new(&mut cx, 0);

    let mut index = 0;

    for process in sys.processes_by_name(&process_name) {
        if process.name() == &process_name {
            let id = cx.number(process.pid().as_u32());
            let name = cx.string(process.name().to_string());
            let cmd = cx.string(process.cmd()[0].to_string());

            let obj = cx.empty_object();
            let _ = obj.set(&mut cx, "pid", id);
            let _ = obj.set(&mut cx, "name", name);
            let _ = obj.set(&mut cx, "cmd", cmd);

            let _ = result_array.set(&mut cx, index, obj);
            index += 1;
        }
    }

    Ok(result_array.upcast())
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("process_by_name", process_by_name)?;
    Ok(())
}
