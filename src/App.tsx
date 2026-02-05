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
  Person as PersonIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { MeetingService } from './services/meetingService';
import type { AuthStatus, TranscriptData, AnalyzeResponse } from './services/meetingService';

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchingMeetingId, setFetchingMeetingId] = useState<number | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [analyzeResponse, setAnalyzeResponse] = useState<AnalyzeResponse | null>(null);
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
      url: "https://teams.microsoft.com/meet/32829331378792?p=1OLQSl9P0J3jj8cXYd",
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
      const authData = await MeetingService.checkAuthStatus();
      setAuthStatus(authData);
    } catch (err) {
      console.error('Auth status check failed:', err);
      setAuthStatus({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = MeetingService.getLoginUrl();
  };

  const handleLogout = async () => {
    try {
      await MeetingService.logout();
      setAuthStatus({ authenticated: false });
      setTranscriptData(null);
      setAnalyzeResponse(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleFetchMeetingSummary = async (meetingUrl: string, meetingTitle: string, meetingId: number) => {
    setFetching(true);
    setFetchingMeetingId(meetingId);
    setError(null);
    setTranscriptData(null);
    setAnalyzeResponse(null);

    try {
      const result = await MeetingService.fetchAndAnalyzeMeeting(meetingUrl, meetingTitle);

      if (result.success) {
        setTranscriptData(result.data!);
        setAnalyzeResponse(result.analyzeResponse || null);

        // Log analyze response for debugging
        if (result.analyzeResponse) {
          console.log('📊 Analyze Response Mode:', result.analyzeResponse.data?.mode);
          console.log('🔗 Page URL:', result.analyzeResponse.data?.page_url);
          console.log('📄 HTML Content Available:', !!result.analyzeResponse.data?.html);
          if (result.analyzeResponse.data?.html) {
            console.log('📄 HTML Content Preview:', result.analyzeResponse.data.html.substring(0, 200) + '...');
          }
        }

        if (result.error) {
          setError(result.error);
        }
      } else {
        setError(result.error || 'Failed to process meeting');
      }
    } catch (err: unknown) {
      console.error('❌ Error in meeting summary process:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during the process';
      setError(errorMessage);
    } finally {
      setFetching(false);
      setFetchingMeetingId(null);
    }
  };

  const handleConfluenceClick = () => {
    if (analyzeResponse?.data?.page_url) {
      window.open(analyzeResponse.data.page_url, '_blank');
    }
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
                Fetch & Analyze Meeting Data
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select a meeting below to fetch transcripts and generate intelligent analysis with key insights
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
                          sx={{ ml: 2, width: 180 }}
                        >
                          {fetchingMeetingId === meeting.id ? 'Processing...' : 'Summary'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>

            {/* Success Message */}
            {transcriptData && (
              <>
                <Box
                  sx={{
                    mt: 2,
                    mb: 2,
                    p: 2,
                    backgroundColor: '#e8f5e8',
                    border: '1px solid #4caf50',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#4caf50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✓
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32' }}>
                      Summary generated successfully!
                    </Typography>
                  </Box>

                  {/* Show green Confluence button only if mode is "publish" */}
                  {analyzeResponse?.data?.mode === "publish" && analyzeResponse?.data?.page_url && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<OpenInNewIcon />}
                      onClick={handleConfluenceClick}
                      size="small"
                      sx={{
                        backgroundColor: '#4caf50',
                        '&:hover': {
                          backgroundColor: '#388e3c'
                        },
                        minWidth: 'auto',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Open in Confluence
                    </Button>
                  )}
                </Box>

                {/* Display HTML content when test_mode is true */}
                {analyzeResponse?.data?.html && (
                  <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      📋 Generated Summary
                    </Typography>
                    <Box
                      dangerouslySetInnerHTML={{ __html: analyzeResponse.data.html }}
                      sx={{
                        '& h1, & h2, & h3, & h4, & h5, & h6': {
                          color: 'text.primary',
                          marginTop: 2,
                          marginBottom: 1,
                        },
                        '& p': {
                          marginBottom: 1,
                          color: 'text.secondary',
                        },
                        '& ul, & ol': {
                          paddingLeft: 2,
                          marginBottom: 1,
                        },
                        '& li': {
                          marginBottom: 0.5,
                          color: 'text.secondary',
                        },
                        '& strong': {
                          color: 'text.primary',
                        },
                        '& code': {
                          backgroundColor: 'grey.100',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        },
                        '& pre': {
                          backgroundColor: 'grey.100',
                          padding: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                  </Paper>
                )}
              </>
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