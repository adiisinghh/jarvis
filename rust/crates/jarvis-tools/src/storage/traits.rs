//! MemoryBackend trait for all storage backends.

use jarvis_core::{JarvisError, RetrievalResult};
use serde_json::Value;

pub trait MemoryBackend: Send + Sync {
    fn backend_id(&self) -> &str;
    fn store(
        &self,
        content: &str,
        source: &str,
        metadata: Option<&Value>,
    ) -> Result<String, JarvisError>;
    fn retrieve(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<RetrievalResult>, JarvisError>;
    fn delete(&self, doc_id: &str) -> Result<bool, JarvisError>;
    fn clear(&self) -> Result<(), JarvisError>;
    fn count(&self) -> Result<usize, JarvisError>;
}
