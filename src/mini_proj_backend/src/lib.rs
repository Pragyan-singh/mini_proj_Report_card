use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize)]
pub struct ReportCard {
    pub name: String,
    pub total_marks: u32,
    pub num_subjects: u32,
    pub average: f32,
    pub grade: String,
}

#[ic_cdk::query]
pub fn generate_report_card(name: String, total_marks: u32, total_max_marks: u32, num_subjects: u32) -> ReportCard {
    let percentage = if total_max_marks > 0 {
        (total_marks as f32 / total_max_marks as f32) * 100.0
    } else {
        0.0
    };
    let grade = if percentage >= 90.0 {
        "A"
    } else if percentage >= 75.0 {
        "B"
    } else if percentage >= 60.0 {
        "C"
    } else {
        "D"
    };

    ReportCard {
        name,
        total_marks,
        num_subjects,
        average: percentage,
        grade: grade.to_string(),
    }
}
