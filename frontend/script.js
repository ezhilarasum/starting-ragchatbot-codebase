// API base URL - use relative path to work from any host
const API_URL = '/api';

// Global state
let currentSessionId = null;

// DOM elements
let chatMessages, chatInput, sendButton, totalCourses, courseList;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements after page loads
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    totalCourses = document.getElementById('totalCourses');
    courseList = document.getElementById('courseList');
    
    setupEventListeners();
    createNewSession();
    loadCourseStats();
});

// Event Listeners
function setupEventListeners() {
    // Chat functionality
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // New chat button
    document.getElementById('newChatBtn').addEventListener('click', () => {
        createNewSession();
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    });

    // Suggested questions
    document.querySelectorAll('.suggested-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            chatInput.value = question;
            sendMessage();
        });
    });
}


// Chat Functions
async function sendMessage() {
    const query = chatInput.value.trim();
    if (!query) return;

    // Disable input
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;

    // Add user message
    addMessage(query, 'user');

    // Add loading message - create a unique container for it
    const loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                session_id: currentSessionId
            })
        });

        if (!response.ok) throw new Error('Query failed');

        const data = await response.json();
        
        // Update session ID if new
        if (!currentSessionId) {
            currentSessionId = data.session_id;
        }

        // Replace loading message with response
        loadingMessage.remove();
        addMessage(data.answer, 'assistant', data.sources);

    } catch (error) {
        // Replace loading message with error
        loadingMessage.remove();
        addMessage(`Error: ${error.message}`, 'assistant');
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

function createLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    return messageDiv;
}

function addMessage(content, type, sources = null, isWelcome = false) {
    const messageId = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}${isWelcome ? ' welcome-message' : ''}`;
    messageDiv.id = `message-${messageId}`;
    
    // Convert markdown to HTML for assistant messages
    const displayContent = type === 'assistant' ? marked.parse(content) : escapeHtml(content);
    
    let html = `<div class="message-content">${displayContent}</div>`;
    
    if (sources && sources.length > 0) {
        // Create sources list HTML with enhanced styling
        const sourcesListHTML = sources.map(source => {
            // Parse source string: "Course Title - Lesson N" or "Course Title"
            const lessonMatch = source.match(/^(.+?)\s*-\s*Lesson\s+(\d+)$/i);

            if (lessonMatch) {
                // Has lesson number
                const courseTitle = lessonMatch[1];
                const lessonNum = lessonMatch[2];
                return `
                    <div class="source-item">
                        <div class="source-icon lesson-icon">
                            <span class="lesson-number">${lessonNum}</span>
                        </div>
                        <div class="source-details">
                            <div class="source-course">${escapeHtml(courseTitle)}</div>
                            <div class="source-lesson">Lesson ${lessonNum}</div>
                        </div>
                    </div>
                `;
            } else {
                // Course only (no specific lesson)
                return `
                    <div class="source-item">
                        <div class="source-icon course-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v10h10V3H3z"/>
                                <path d="M5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z"/>
                            </svg>
                        </div>
                        <div class="source-details">
                            <div class="source-course">${escapeHtml(source)}</div>
                            <div class="source-lesson">General course content</div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        html += `
            <details class="message-sources">
                <summary>
                    <svg class="sources-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z"/>
                    </svg>
                    Sources (${sources.length})
                </summary>
                <div class="sources-list">${sourcesListHTML}</div>
            </details>
        `;
    }
    
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// Helper function to escape HTML for user messages
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Removed removeMessage function - no longer needed since we handle loading differently

async function createNewSession() {
    currentSessionId = null;
    chatMessages.innerHTML = '';
    addMessage('Welcome to the Course Materials Assistant! I can help you with questions about courses, lessons and specific content. What would you like to know?', 'assistant', null, true);
}

// Render a single course card
function renderCourseCard(course) {
    const titleHtml = course.course_link
        ? `<a class="course-card-title" href="${escapeHtml(course.course_link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(course.title)}</a>`
        : `<span class="course-card-title">${escapeHtml(course.title)}</span>`;

    const instructorHtml = course.instructor
        ? `<span class="course-card-instructor">${escapeHtml(course.instructor)}</span>`
        : '';

    const lessonCountHtml = `<span class="course-card-lesson-count">${course.lesson_count} lesson${course.lesson_count !== 1 ? 's' : ''}</span>`;

    let lessonsHtml = '';
    if (course.lessons && course.lessons.length > 0) {
        const items = course.lessons.map(l => {
            const label = `Lesson ${l.lesson_number}: ${escapeHtml(l.lesson_title)}`;
            if (l.lesson_link) {
                return `<li class="lesson-list-item"><a class="lesson-link" href="${escapeHtml(l.lesson_link)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
            }
            return `<li class="lesson-list-item">${label}</li>`;
        }).join('');

        lessonsHtml = `
            <details class="lesson-details">
                <summary class="lesson-toggle">View lessons</summary>
                <ol class="lesson-list">${items}</ol>
            </details>`;
    }

    return `<div class="course-card">
        ${titleHtml}
        <div class="course-card-meta">
            ${instructorHtml}
            ${lessonCountHtml}
        </div>
        ${lessonsHtml}
    </div>`;
}

// Load course statistics
async function loadCourseStats() {
    try {
        console.log('Loading course stats...');
        const response = await fetch(`${API_URL}/courses`);
        if (!response.ok) throw new Error('Failed to load course stats');

        const data = await response.json();
        console.log('Course data received:', data);

        if (totalCourses) {
            totalCourses.textContent = data.total_courses;
        }

        if (courseList) {
            if (data.courses && data.courses.length > 0) {
                courseList.innerHTML = data.courses.map(renderCourseCard).join('');
            } else {
                courseList.innerHTML = '<span class="no-courses">No courses available</span>';
            }
        }
    } catch (error) {
        console.error('Error loading course stats:', error);
        if (totalCourses) {
            totalCourses.textContent = '0';
        }
        if (courseList) {
            courseList.innerHTML = '<span class="error">Failed to load courses</span>';
        }
    }
}