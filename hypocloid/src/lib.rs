#![feature(test)]

#[macro_use]
extern crate log;

use env_logger::Env;
use std::sync::Arc;
use warp::Filter;

/* internal modules */
mod assets;
mod messages;
mod state;
mod threads;

use state::*;

pub async fn main() -> anyhow::Result<()> {
    env_logger::from_env(Env::default().default_filter_or("hypocloid=debug,warp=info")).init();
    info!("hypocloid!");
    info!("notmuch config: {}", notmuch_config().to_str().unwrap());

    let state = Arc::new(HypoState::new()?);
    let assets = assets::filters::assets();
    let threads = threads::filters::threads(state.clone());
    let messages = messages::filters::messages(state.clone());

    let api = assets
        .or(messages)
        .or(threads)
        .with(warp::log("hypocloid::api"));

    info!("Listening on 127.0.0.1:8088");
    warp::serve(api).run(([127, 0, 0, 1], 8088)).await;

    Ok(())
}