use neon::prelude::*;

pub fn vec_to_number_array<'a, C: Context<'a>, T: Into<f64> + Clone>(
    cx: &mut C,
    vec: &Vec<T>,
) -> JsResult<'a, JsArray> {
    let array = JsArray::new(cx, vec.len());

    for (i, s) in vec.iter().enumerate() {
        let v = cx.number(s.clone());
        array.set(cx, i as u32, v).unwrap();
    }

    Ok(array)
}