use clap::Parser;
use ic_agent::{Agent, AgentError, identity::BasicIdentity};
use ic_agent::export::Principal;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::env;
use genpdf::{elements, Alignment, Document, Element as _};
use octocrab::{Octocrab, models::repos::Content, params::repos::Reference};

/// CLI for generating and uploading student report cards
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Student name
    #[arg(short, long)]
    name: String,
    /// Total marks
    #[arg(short, long)]
    total_marks: u32,
    /// Number of subjects
    #[arg(short, long)]
    num_subjects: u32,
    /// GitHub repository (e.g. username/repo)
    #[arg(long)]
    github_repo: String,
    /// Path in repo to upload PDF (e.g. "pdfs/")
    #[arg(long, default_value = "pdfs/")]
    github_path: String,
    /// GitHub token (or set GITHUB_TOKEN env var)
    #[arg(long)]
    github_token: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ReportCard {
    name: String,
    total_marks: u32,
    num_subjects: u32,
    average: f32,
    grade: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    println!("Input: {:?}", args);

    // 1. Call canister to get report card data
    let report = call_canister(
        &args.name,
        args.total_marks,
        args.num_subjects,
    )?;
    println!("Report card: {:?}", report);

    // 2. Generate PDF
    let pdf_path = format!("{}_report_card.pdf", report.name.replace(" ", "_"));
    generate_pdf(&report, &pdf_path)?;
    println!("PDF generated: {}", pdf_path);

    // 3. Upload PDF to GitHub
    let token = args.github_token.or_else(|| env::var("GITHUB_TOKEN").ok())
        .expect("GitHub token must be provided as --github-token or GITHUB_TOKEN env var");
    upload_to_github(&token, &args.github_repo, &args.github_path, &pdf_path)?;
    println!("PDF uploaded to GitHub repo: {}/{}{}", args.github_repo, args.github_path, pdf_path);

    Ok(())
}

/// Calls the canister to get the report card data
fn call_canister(name: &str, total_marks: u32, num_subjects: u32) -> Result<ReportCard, Box<dyn std::error::Error>> {
    // Local replica principal and canister info
    let canister_id = std::env::var("CANISTER_ID_MINI_PROJ_BACKEND")
        .unwrap_or_else(|_| "uxrrr-q7777-77774-qaaaq-cai".to_string());
    let url = "http://127.0.0.1:4943";
    let agent = Agent::builder()
        .with_url(url)
        .with_identity(BasicIdentity::generate().unwrap())
        .build()?;
    // Wait for replica
    std::thread::sleep(std::time::Duration::from_secs(1));
    let arg = candid::Encode!(&name.to_string(), &total_marks, &num_subjects)?;
    let out = agent.query(&canister_id, "generate_report_card")
        .with_arg(arg)
        .call()?;
    let (report,): (ReportCard,) = candid::Decode!(&out)?;
    Ok(report)
}

/// Generates a PDF from the report card data
fn generate_pdf(report: &ReportCard, path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let font_family = genpdf::fonts::from_files("/usr/share/fonts", "LiberationSans", None)
        .or_else(|_| genpdf::fonts::from_files("/usr/share/fonts", "DejaVuSans", None))?;
    let mut doc = Document::new(font_family);
    doc.set_title("Student Report Card");
    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(10);
    doc.set_page_decorator(decorator);
    let mut elements = vec![
        elements::Paragraph::new("Student Report Card").aligned(Alignment::Center).styled(genpdf::style::Style::new().bold()),
        elements::Break::new(1),
        elements::Paragraph::new(format!("Name: {}", report.name)),
        elements::Paragraph::new(format!("Total Marks: {}", report.total_marks)),
        elements::Paragraph::new(format!("Number of Subjects: {}", report.num_subjects)),
        elements::Paragraph::new(format!("Average: {:.2}", report.average)),
        elements::Paragraph::new(format!("Grade: {}", report.grade)),
    ];
    for el in elements {
        doc.push(el);
    }
    let mut file = File::create(path)?;
    doc.render(&mut file)?;
    Ok(())
}

/// Uploads the PDF to the specified GitHub repo/path
fn upload_to_github(token: &str, repo: &str, path: &str, pdf_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let octocrab = Octocrab::builder().personal_token(token.to_string()).build()?;
    let (owner, repo_name) = repo.split_once('/').expect("repo must be in 'owner/repo' format");
    let branch = "main";
    let pdf_bytes = std::fs::read(pdf_path)?;
    let pdf_b64 = base64::encode(&pdf_bytes);
    let full_path = format!("{}{}", path, pdf_path);
    // Get the reference to the branch
    let reference = octocrab
        .repos(owner, repo_name)
        .get_ref(&format!("heads/{}", branch))?;
    let sha = reference.object.sha;
    // Create or update the file
    let res = octocrab
        .repos(owner, repo_name)
        .create_or_update_file(
            &full_path,
            branch,
            &pdf_b64,
            "Add student report card PDF",
        )
        .sha(sha)
        .send()?;
    Ok(())
}
