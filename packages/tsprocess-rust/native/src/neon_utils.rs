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

pub fn parse_i32(number: f64) -> i32 {
  number
      .round()
      .rem_euclid(2f64.powi(
        std::mem::size_of::<i32>() as i32 * 8
      )) as u32 as i32
}