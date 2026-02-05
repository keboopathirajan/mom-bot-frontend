import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  ContentPaste as PasteIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

// API base URL - always use Render backend since auth redirect URI is configured for it
const API_BASE_URL = 'https://mom-bot-transcript-service.onrender.com';

interface AuthStatus {
  authenticated: boolean;
  user?: {
    displayName: string;
    email: string;
  };
  loginUrl?: string;
}

interface TranscriptEntry {
  startTime: string;
  endTime: string;
  text: string;
  speaker?: string;
}

interface Attendee {
  name: string;
  email: string;
}

interface TranscriptData {
  meetingInfo: {
    id: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    attendees: Attendee[];
  };
  transcripts: Array<{
    id: string;
    createdDateTime: string;
    entries: TranscriptEntry[];
  }>;
}

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchingMeetingId, setFetchingMeetingId] = useState<number | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Predefined meetings for SIXT
  const [predefinedMeetings] = useState([
    {
      id: 1,
      title: "Hackathon Project: Integration discussion",
      description: "Discussion about the integration of the new product with the existing system",
      url: "https://teams.microsoft.com/meet/34349166966557?p=LxX7J4WLhDKz2oYJcA",
      date: "February 2026",
      duration: "30 min"
    },
    {
      id: 2,
      title: "Orange Hour January 2026",
      description: "Discussion about tech trends and activities of the month",
      url: "https://teams.microsoft.com/meet/39333370029593",
      date: "January 2026",
      duration: "45 min"
    },
    {
      id: 3,
      title: "[ALL HANDS] Digital Experience Engineering Kickoff 2026",
      description: "Discussion about the new year's goals and plans",
      url: "https://teams.microsoft.com/meet/3230909735793?p=e52RmplBCjjhsny8oh",
      date: "February 2026",
      duration: "60 min"
    }
  ]);

  // Check auth status on load and handle URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');

    if (authStatus === 'success') {
      // Clear URL params and show success
      window.history.replaceState({}, '', window.location.pathname);
      checkAuthStatus(); // This will show authenticated status
    } else if (authStatus === 'error') {
      const message = urlParams.get('message') || 'Authentication failed';
      setError(decodeURIComponent(message));
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
    } else {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status with API:', `${API_BASE_URL}/auth/status`);

      // Add cache-busting parameter and headers
      const url = `${API_BASE_URL}/auth/status?t=${Date.now()}`;
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      console.log('Auth status response:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Auth status data:', data);
      console.log('Setting auth status to:', data.authenticated);

      setAuthStatus(data);
    } catch (err) {
      console.error('Auth status check failed:', err);
      setAuthStatus({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Always redirect to Render backend for OAuth
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' });
      setAuthStatus({ authenticated: false });
      setTranscriptData(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleFetchMeetingSummary = async (meetingUrl: string, meetingTitle: string, meetingId: number) => {
    setFetching(true);
    setFetchingMeetingId(meetingId);
    setError(null);
    setTranscriptData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/transcript/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ joinUrl: meetingUrl }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('🎉 MEETING SUMMARY SUCCESSFULLY GENERATED!');
        console.log('==========================================');
        console.log(`📋 Meeting: ${meetingTitle}`);
        console.log('📋 Meeting Info:', data.data?.meetingInfo);
        console.log('📝 Full Summary Data:', data.data);
        console.log('==========================================');

        // Log summary entries in a readable format
        if (data.data?.transcripts?.length > 0) {
          data.data.transcripts.forEach((transcript: any, index: number) => {
            console.log(`\n📄 Summary Section ${index + 1}:`);
            console.log(`Created: ${transcript?.createdDateTime || 'Unknown'}`);
            console.log('Key Points:');
            transcript?.entries?.forEach((entry: any, entryIndex: number) => {
              console.log(`${entryIndex + 1}. [${entry?.startTime || '00:00'} - ${entry?.endTime || '00:00'}] ${entry?.speaker ? `${entry.speaker}: ` : ''}${entry?.text || 'No content'}`);
            });
          });
        }
        console.log('\n==========================================');

        setTranscriptData(data.data);
      } else {
        setError(data.message || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setFetching(false);
      setFetchingMeetingId(null);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const downloadTranscript = () => {
    if (!transcriptData) return;

    const content = transcriptData.transcripts?.map((transcript, index) => {
      const header = `Meeting: ${transcriptData.meetingInfo?.subject || 'Untitled Meeting'}\nDate: ${transcriptData.meetingInfo?.startDateTime ? formatTime(transcriptData.meetingInfo.startDateTime) : 'Unknown'}\nTranscript ID: ${transcript?.id || `transcript-${index + 1}`}\n\n`;
      const entries = transcript?.entries?.map(entry =>
        `[${entry?.startTime || '00:00'} - ${entry?.endTime || '00:00'}] ${entry?.speaker ? `${entry.speaker}: ` : ''}${entry?.text || 'No content'}`
      ).join('\n') || 'No transcript entries available';
      return header + entries;
    }).join('\n\n---\n\n') || 'No transcript data available';

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${transcriptData.meetingInfo?.id || 'meeting'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, rgba(255,80,0,1) 0%, rgba(255,80,0,0.8) 100%)' }}>
          <Typography variant="h4" color="white" gutterBottom sx={{ fontWeight: 700 }}>
            SIXT Meeting Summary Generator
          </Typography>
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            AI-powered meeting insights and summaries
          </Typography>
        </Paper>

        {/* Authentication Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                Authentication Status
              </Typography>
              {authStatus.authenticated ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    icon={<PersonIcon />}
                    label={`Welcome, ${authStatus.user?.displayName || 'User'}`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={authStatus.user?.email || ''}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              ) : (
                <Chip
                  label="Not authenticated"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
            <Box>
              {authStatus.authenticated ? (
                <Button
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  color="secondary"
                >
                  Logout
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<LoginIcon />}
                  onClick={handleLogin}
                  size="large"
                >
                  Login with Microsoft
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Main Content */}
        {authStatus.authenticated ? (
          <>
            {/* Transcript Fetcher */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generate Meeting Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select a meeting below to generate an intelligent summary with key insights
              </Typography>

              <Box sx={{ mt: 3 }}>
                {predefinedMeetings.map((meeting) => (
                  <Card key={meeting.id} sx={{
                    mb: 3,
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#FFFFFF',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(255, 80, 0, 0.15)',
                      borderColor: 'rgba(255,80,0,1)',
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s ease-in-out'
                    }
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1A1A1A' }}>
                            {meeting.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {meeting.description}
                          </Typography>
                          <Box display="flex" gap={2} sx={{ mb: 2 }}>
                            <Chip
                              label={meeting.date}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: 'rgba(255,80,0,1)', color: 'rgba(255,80,0,1)', fontWeight: 500 }}
                            />
                            <Chip
                              label={meeting.duration}
                              size="small"
                              variant="filled"
                              sx={{
                                background: 'linear-gradient(135deg, rgba(255,80,0,1) 0%, rgba(255,80,0,0.8) 100%)',
                                color: 'white',
                                fontWeight: 500
                              }}
                            />
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          onClick={() => handleFetchMeetingSummary(meeting.url, meeting.title, meeting.id)}
                          disabled={fetching}
                          startIcon={fetchingMeetingId === meeting.id ? <CircularProgress size={20} /> : <PasteIcon />}
                          sx={{ ml: 2, width: 230 }}
                        >
                          {fetchingMeetingId === meeting.id ? 'Generating...' : 'Generate Summary'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                {transcriptData && (
                  <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={downloadTranscript}
                      size="large"
                    >
                      Download Summary
                    </Button>
                  </Box>
                )}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>

            {/* Transcript Results */}
            {transcriptData && (
              <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: 'success.main', fontWeight: 600 }}>
                    ✅ Summary Generated Successfully!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Meeting: {transcriptData.meetingInfo?.subject || 'Untitled Meeting'}
                  </Typography>
                  {transcriptData.transcripts?.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Generated summary from {transcriptData.transcripts.length} transcript(s) containing{' '}
                      {transcriptData.transcripts.reduce((total, t) => total + (t?.entries?.length || 0), 0)} conversation entries
                    </Typography>
                  )}
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    📋 <strong>To view the detailed summary data:</strong><br />
                    Open your browser's Developer Tools (F12) → Console tab<br />
                    The complete summary data with insights is logged there.
                  </Typography>
                </Alert>

                <Box display="flex" justifyContent="center" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadTranscript}
                    size="large"
                  >
                    Download Summary
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setTranscriptData(null);
                    }}
                    size="large"
                  >
                    Fetch Another
                  </Button>
                </Box>
              </Paper>
            )}
          </>
        ) : (
          /* Not Authenticated */
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Authentication Required
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Please log in with your Microsoft account to generate meeting summaries.
            </Typography>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
              size="large"
              sx={{ mt: 2 }}
            >
              Login with Microsoft
            </Button>
          </Paper>
        )}

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            SIXT Meeting Summary Generator - Powered by AI
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default App;