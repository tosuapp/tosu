#[macro_export]
macro_rules! read_function_impl {
    ($t: ident) => {
        paste! {
            fn [<read_ $t>](mut cx: FunctionContext) -> JsResult<JsNumber> {
                let this: Handle<JsObject> = cx.this()?;

                let address = cx.argument::<JsNumber>(0)?.value(&mut cx);
                let address = parse_i32(address) as Address;
                let memory_reader: Handle<JsBox<Box<OsuMemoryReader>>> = this
                      .get(&mut cx, "memoryReaderPointer")
                      .unwrap();

                let result = memory_reader.[<read_ $t>](address)
                    .or_else(|_| cx.throw_error(
                        format!("Failed to read {} at {} address", stringify!($t), address)
                    ))?;

                Ok(cx.number(result as f64))
            }
        }
    }
}

#[macro_export]
macro_rules! read_export_impl {
    ($cx: expr, $prototype: expr, $t: ident) => {
        paste! {
            let [<memory_reader_read_ $t>] = JsFunction::new(
                $cx,
                [<read_ $t>]
            )?;

            let key = concat!("read_", stringify!($t));

            $prototype.set(
                $cx,
                key,
                [<memory_reader_read_ $t>]
            )?;
        }
    }
}
