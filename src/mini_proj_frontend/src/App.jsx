import React, { useState } from 'react';
import { mini_proj_backend } from 'declarations/mini_proj_backend';
import jsPDF from 'jspdf';

function App() {
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState([{ name: '', marks: '', maxMarks: '' }]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubjectChange = (idx, field, value) => {
    setSubjects((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addSubject = () => {
    setSubjects((prev) => [...prev, { name: '', marks: '', maxMarks: '' }]);
  };

  const removeSubject = (idx) => {
    setSubjects((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const handleSubmit = async () => {
    try {
      const validSubjects = subjects.filter(s => s.name.trim() && s.marks !== '' && !isNaN(Number(s.marks)) && s.maxMarks !== '' && !isNaN(Number(s.maxMarks)));
      if (!name.trim() || validSubjects.length === 0) {
        setError('Please enter student name and at least one valid subject with marks and maximum marks.');
        setResult(null);
        return;
      }
      const totalMarks = validSubjects.reduce((sum, s) => sum + Number(s.marks), 0);
      const totalMaxMarks = validSubjects.reduce((sum, s) => sum + Number(s.maxMarks), 0);
      const numSubjects = validSubjects.length;
      const response = await mini_proj_backend.generate_report_card(
        name,
        totalMarks,
        totalMaxMarks,
        numSubjects
      );
      setResult(response);
      setError(null);
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Report Card', 20, 20);
    doc.setFontSize(12);
    let y = 40;
    doc.text(`Student Name: ${result.name}`, 20, y); y += 10;
    doc.text(`Total Marks: ${result.total_marks}`, 20, y); y += 10;
    doc.text(`Number of Subjects: ${result.num_subjects}`, 20, y); y += 10;
    doc.text(`Average Marks: ${result.average}`, 20, y); y += 10;
    doc.text(`Grade: ${result.grade}`, 20, y); y += 10;
    // Add subject-wise marks
    doc.text('Subject-wise Marks:', 20, y); y += 10;
    subjects.forEach((s, idx) => {
      if (s.name && s.marks !== '' && s.maxMarks !== '') {
        doc.text(`${idx + 1}. ${s.name}: ${s.marks} / ${s.maxMarks}`, 25, y);
        y += 8;
      }
    });
    doc.save(`${result.name.replace(/\s+/g, '_')}_report_card.pdf`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2.5rem 2rem', maxWidth: 600, minWidth: 320, width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: '#2d6cdf', marginBottom: '2rem', fontWeight: 700, letterSpacing: 1 }}>📘 Student Report Card</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 16 }}
            placeholder="Student Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div style={{ marginBottom: 8, width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Subjects, Marks & Max Marks</div>
            {subjects.map((subject, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <input
                  style={{ flex: 2, minWidth: 120, padding: '0.5rem', borderRadius: 6, border: '1px solid #d0d7de', fontSize: 15 }}
                  placeholder={`Subject ${idx + 1}`}
                  value={subject.name}
                  onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                />
                <input
                  style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 6, border: '1px solid #d0d7de', fontSize: 15 }}
                  placeholder="Marks"
                  type="number"
                  value={subject.marks}
                  onChange={e => handleSubjectChange(idx, 'marks', e.target.value)}
                />
                <input
                  style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 6, border: '1px solid #d0d7de', fontSize: 15 }}
                  placeholder="Max"
                  type="number"
                  value={subject.maxMarks}
                  onChange={e => handleSubjectChange(idx, 'maxMarks', e.target.value)}
                />
                <button
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0 8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'background 0.2s',
                  }}
                  onClick={() => removeSubject(idx)}
                  disabled={subjects.length === 1}
                  title={subjects.length === 1 ? 'At least one subject required' : 'Remove subject'}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              style={{ marginTop: 4, background: '#2d6cdf', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              onClick={addSubject}
            >
              + Add Subject
            </button>
          </div>
          <button
            style={{
              padding: '0.75rem',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(90deg, #2d6cdf 0%, #6eb1f7 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(45,108,223,0.08)',
              transition: 'background 0.2s',
            }}
            onClick={handleSubmit}
          >
            Generate
          </button>
        </div>

        {result && (
          <div style={{ marginTop: '2rem', background: '#f6f8fa', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(45,108,223,0.04)' }}>
            <h2 style={{ textAlign: 'center', color: '#2d6cdf', marginBottom: '1rem', fontWeight: 600 }}>Report Card</h2>
            <div style={{ fontSize: 16, lineHeight: 1.7 }}>
              <p><strong>Student Name:</strong> {result.name}</p>
              <p><strong>Total Marks:</strong> {result.total_marks}</p>
              <p><strong>Number of Subjects:</strong> {result.num_subjects}</p>
              <p><strong>Average Marks:</strong> {result.average}</p>
              <p><strong>Grade:</strong> <span style={{ color: '#fff', background: '#2d6cdf', borderRadius: 6, padding: '2px 10px', fontWeight: 700 }}>{result.grade}</span></p>
              <div style={{ marginTop: 10 }}>
                <strong>Subject-wise Marks:</strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {subjects.map((s, idx) => (
                    (s.name && s.marks !== '' && s.maxMarks !== '') && (
                      <li key={idx}>{s.name}: {s.marks} / {s.maxMarks}</li>
                    )
                  ))}
                </ul>
              </div>
            </div>
            <button
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.75rem',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(45,108,223,0.08)',
                transition: 'background 0.2s',
              }}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
          </div>
        )}

        {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  );
}

export default App;
