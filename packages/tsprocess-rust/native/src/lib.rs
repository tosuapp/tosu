mod memory;
mod neon_utils;
mod macros;
mod platform_utils;

use neon::prelude::*;
use paste::paste;

use crate::memory::memory_reader::*;
use crate::neon_utils::{vec_to_number_array};
use crate::platform_utils::utils::{PlatformUtilsMethods, PlatformUtils};

fn is_process_exists(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let process_id = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let result = OsuMemoryReader::is_process_exists(process_id as ProcessId)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.boolean(result))
}

fn find_processes(mut cx: FunctionContext) -> JsResult<JsArray> {
    let name = cx.argument::<JsString>(0)?.value(&mut cx);
    let result = OsuMemoryReader::find_processes(name)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    let data = vec_to_number_array(&mut cx, &result)?;

    Ok(data)
}

fn get_process_path(mut cx: FunctionContext) -> JsResult<JsString> {
    let process_id = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let result = PlatformUtils::get_process_path(process_id as ProcessId)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.string(result))
}

fn get_process_command_line(mut cx: FunctionContext) -> JsResult<JsString> {
    let process_id = cx.argument::<JsNumber>(0)?.value(&mut cx);
    let result = PlatformUtils::get_process_path(process_id as ProcessId)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.string(result))
}

fn memory_reader_constructor(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let this: Handle<JsObject> = cx.this()?;
    let process_id = cx.argument::<JsNumber>(0)?.value(&mut cx) as ProcessId;

    let reader = OsuMemoryReader::new(process_id)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    let reader = Box::new(reader);

    let this_process_id = cx.number(process_id);
    let this_reader = cx.boxed(reader);

    this.set(&mut cx, "processId", this_process_id)?;
    this.set(&mut cx, "memoryReaderPointer", this_reader)?;

    Ok(cx.undefined())
}

fn find_signature(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let signature = cx.argument::<JsString>(0)?.value(&mut cx);

    let this: Handle<JsObject> = cx.this()?;
    let memory_reader: Handle<JsBox<Box<OsuMemoryReader>>> = this
        .get(&mut cx, "memoryReaderPointer")
        .unwrap();

    let address = memory_reader.find_signature(signature.clone())
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.number(address as f64))
}

fn read(mut cx: FunctionContext) -> JsResult<JsArray> {
    let address = cx.argument::<JsNumber>(0)?.value(&mut cx) as Address;
    let length = cx.argument::<JsNumber>(1)?.value(&mut cx);

    let this: Handle<JsObject> = cx.this()?;
    let memory_reader: Handle<JsBox<Box<OsuMemoryReader>>> = this
        .get(&mut cx, "memoryReaderPointer")
        .unwrap();

    let result = memory_reader.read(
        address,
        length as usize,
    ).or_else(|e| cx.throw_error(e.to_string()))?;

    let data = vec_to_number_array(&mut cx, &result)?;

    Ok(data)
}

fn read_pointer(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let address = cx.argument::<JsNumber>(0)?.value(&mut cx) as Address;

    let this: Handle<JsObject> = cx.this()?;
    let memory_reader: Handle<JsBox<Box<OsuMemoryReader>>> = this
        .get(&mut cx, "memoryReaderPointer")
        .unwrap();

    let ptr = memory_reader.read_pointer(address)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.number(ptr as f64))
}

fn read_string(mut cx: FunctionContext) -> JsResult<JsString> {
    let address = cx.argument::<JsNumber>(0)?.value(&mut cx) as Address;

    let this: Handle<JsObject> = cx.this()?;
    let memory_reader: Handle<JsBox<Box<OsuMemoryReader>>> = this
        .get(&mut cx, "memoryReaderPointer")
        .unwrap();

    let str = memory_reader.read_string(address)
        .or_else(|e| cx.throw_error(e.to_string()))?;

    Ok(cx.string(str))
}

read_function_impl!(i8);
read_function_impl!(i16);
read_function_impl!(i32);
read_function_impl!(i64);

read_function_impl!(u8);
read_function_impl!(u16);
read_function_impl!(u32);
read_function_impl!(u64);

read_function_impl!(f32);
read_function_impl!(f64);

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    let memory_reader_init = JsFunction::new(
        &mut cx,
        memory_reader_constructor,
    )?;

    let memory_reader_prototype: Handle<JsObject> = memory_reader_init
        .get(&mut cx, "prototype")
        .expect("failed to get prototype");

    let memory_reader_is_process_exist = JsFunction::new(
        &mut cx,
        is_process_exists,
    )?;

    memory_reader_init.set(&mut cx, "isProcessExists", memory_reader_is_process_exist)?;

    let memory_reader_find_processes = JsFunction::new(
        &mut cx,
        find_processes,
    )?;

    memory_reader_init.set(&mut cx, "findProcesses", memory_reader_find_processes)?;

    let memory_reader_get_process_path = JsFunction::new(
        &mut cx,
        get_process_path,
    )?;

    memory_reader_init.set(&mut cx, "getProcessPath", memory_reader_get_process_path)?;

    let memory_reader_get_process_command_line = JsFunction::new(
        &mut cx,
        get_process_command_line,
    )?;

    memory_reader_init.set(&mut cx, "getProcessCommandLine", memory_reader_get_process_command_line)?;

    let memory_reader_find_signature = JsFunction::new(
        &mut cx,
        find_signature,
    )?;

    memory_reader_prototype.set(&mut cx, "findSignature", memory_reader_find_signature)?;

    let memory_reader_read = JsFunction::new(
        &mut cx,
        read,
    )?;

    memory_reader_prototype.set(&mut cx, "readRaw", memory_reader_read)?;

    let memory_reader_read_pointer = JsFunction::new(
        &mut cx,
        read_pointer,
    )?;

    memory_reader_prototype.set(&mut cx, "readPointer", memory_reader_read_pointer)?;

    let memory_reader_read_string = JsFunction::new(
        &mut cx,
        read_string,
    )?;

    memory_reader_prototype.set(&mut cx, "readString", memory_reader_read_string)?;

    read_export_impl!(&mut cx, memory_reader_prototype, i8);
    read_export_impl!(&mut cx, memory_reader_prototype, i16);
    read_export_impl!(&mut cx, memory_reader_prototype, i32);
    read_export_impl!(&mut cx, memory_reader_prototype, i64);

    read_export_impl!(&mut cx, memory_reader_prototype, u8);
    read_export_impl!(&mut cx, memory_reader_prototype, u16);
    read_export_impl!(&mut cx, memory_reader_prototype, u32);

    read_export_impl!(&mut cx, memory_reader_prototype, f32);
    read_export_impl!(&mut cx, memory_reader_prototype, f64);
    read_export_impl!(&mut cx, memory_reader_prototype, u64);

    cx.export_value("MemoryReader", memory_reader_init)?;
    Ok(())
}
