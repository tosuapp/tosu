#[macro_export]
macro_rules! read_primitive_impl {
    ($t: ident) => {
        paste! {
            fn [<read_ $t>](
                &self,
                address: Address
            ) -> Result<$t, MemoryReaderError> {
                let bytes = self.read(address, std::mem::size_of::<$t>())?;
                let data = $t::from_le_bytes(bytes.try_into().unwrap());

                Ok(data)
            }
        }
    }
}
