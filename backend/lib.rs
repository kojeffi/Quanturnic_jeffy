use ic_cdk::update;
use candid::{CandidType, Deserialize};
use std::cell::RefCell;

// Basic user context placeholder (for future auth)
#[derive(CandidType, Deserialize, Clone)]
pub struct UserContext {
    principal_id: String, // future Internet Identity integration
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TradeLog {
    timestamp: u64,
    action: String,
    reason: String,
    price: f64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct BotConfig {
    strategy: String,
    threshold: f64,
}

thread_local! {
    static TRADE_LOGS: RefCell<Vec<TradeLog>> = RefCell::new(Vec::new());
    static BOT_ACTIVE: RefCell<bool> = RefCell::new(false);
    static BOT_CONFIG: RefCell<BotConfig> = RefCell::new(BotConfig {
        strategy: "basic".to_string(),
        threshold: 0.5,
    });
    static BALANCE: RefCell<f64> = RefCell::new(1000.0); // mock balance
}

#[update]
fn start_bot() {
    BOT_ACTIVE.with(|b| b.replace(true));
}

#[update]
fn stop_bot() {
    BOT_ACTIVE.with(|b| b.replace(false));
}

#[update]
fn is_bot_active() -> bool {
    BOT_ACTIVE.with(|b| *b.borrow())
}

#[update]
fn get_trade_logs() -> Vec<TradeLog> {
    TRADE_LOGS.with(|logs| logs.borrow().clone())
}

#[update]
fn get_bot_config() -> BotConfig {
    BOT_CONFIG.with(|cfg| cfg.borrow().clone())
}

#[update]
fn update_config(strategy: String, threshold: f64) {
    BOT_CONFIG.with(|cfg| {
        cfg.replace(BotConfig { strategy, threshold });
    });
}

#[update]
fn get_balance() -> f64 {
    BALANCE.with(|b| *b.borrow())
}

#[update]
fn analyze_market(price_history: Vec<f64>) -> String {
    let config = BOT_CONFIG.with(|cfg| cfg.borrow().clone());
    let strategy = config.strategy;
    let threshold = config.threshold;

    if price_history.len() < 3 {
        return "Not enough data".to_string();
    }

    let action = match strategy.as_str() {
        "basic" => {
            let avg_change = (price_history[price_history.len() - 1] - price_history[price_history.len() - 3]) / 2.0;
            if avg_change > threshold {
                "BUY"
            } else if avg_change < -threshold {
                "SELL"
            } else {
                "HOLD"
            }
        },
        "macd" => {
            // Placeholder logic for MACD
            // (In a real version, implement MACD calculation using exponential moving averages)
            if price_history.last().unwrap_or(&0.0) % 2.0 == 0.0 {
                "BUY"
            } else {
                "SELL"
            }
        },
        _ => "HOLD",
    };

    BALANCE.with(|bal| {
        let mut balance = bal.borrow_mut();
        match action {
            "BUY" => *balance -= 5.0,
            "SELL" => *balance += 5.0,
            _ => (),
        }
    });

    TRADE_LOGS.with(|logs| {
        logs.borrow_mut().push(TradeLog {
            timestamp: ic_cdk::api::time(),
            action: action.to_string(),
            reason: format!("Strategy: {}, Price: {:.2}", strategy, price_history.last().unwrap_or(&0.0)),
            price: *price_history.last().unwrap_or(&0.0),
        });
    });

    action.to_string()
}

ic_cdk::export_candid!();
