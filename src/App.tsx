import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  ContentPaste as PasteIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Groups as GroupsIcon,
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
  const [meetingUrl, setMeetingUrl] = useState('');
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include',
      });
      console.log('Auth status response:', response.status, response.statusText);
      const data = await response.json();
      console.log('Auth status data:', data);
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

  const handleFetchTranscript = async () => {
    if (!meetingUrl.trim()) {
      setError('Please enter a Teams meeting URL');
      return;
    }

    setFetching(true);
    setError(null);
    setTranscriptData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/transcript/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ joinUrl: meetingUrl.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Transcript Data received:', data.data);
        console.log('Meeting Info:', data.data?.meetingInfo);
        console.log('Transcripts array:', data.data?.transcripts);
        setTranscriptData(data.data);
      } else {
        setError(data.message || 'Failed to fetch transcript');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setFetching(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const durationMs = end - start;
      const minutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    } catch {
      return 'Unknown';
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
        <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Typography variant="h4" color="white" gutterBottom sx={{ fontWeight: 700 }}>
            MoM Bot Transcript Service
          </Typography>
          <Typography variant="h6" color="white" sx={{ opacity: 0.9 }}>
            Fetch Microsoft Teams meeting transcripts automatically
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
                Fetch Meeting Transcript
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enter a Microsoft Teams meeting URL to fetch its transcript
              </Typography>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Teams Meeting URL"
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  multiline
                  rows={2}
                />

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={handleFetchTranscript}
                    disabled={fetching || !meetingUrl.trim()}
                    startIcon={fetching ? <CircularProgress size={20} /> : <PasteIcon />}
                    sx={{ flexShrink: 0 }}
                  >
                    {fetching ? 'Fetching...' : 'Fetch Transcript'}
                  </Button>

                  {transcriptData && (
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={downloadTranscript}
                    >
                      Download
                    </Button>
                  )}
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>

            {/* Transcript Results */}
            {transcriptData && (
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* Meeting Info Header */}
                <Card sx={{ mb: 3, background: 'linear-gradient(45deg, #f3f4f6, #e5e7eb)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {transcriptData.meetingInfo?.subject || 'Untitled Meeting'}
                    </Typography>
                    
                    <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
                      {transcriptData.meetingInfo?.startDateTime && (
                        <Chip
                          icon={<TimeIcon />}
                          label={`Start: ${formatTime(transcriptData.meetingInfo.startDateTime)}`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {transcriptData.meetingInfo?.endDateTime && (
                        <Chip
                          icon={<TimeIcon />}
                          label={`End: ${formatTime(transcriptData.meetingInfo.endDateTime)}`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {transcriptData.meetingInfo?.startDateTime && transcriptData.meetingInfo?.endDateTime && (
                        <Chip
                          label={`Duration: ${formatDuration(transcriptData.meetingInfo.startDateTime, transcriptData.meetingInfo.endDateTime)}`}
                          variant="outlined"
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>

                    {transcriptData.meetingInfo?.attendees?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupsIcon fontSize="small" />
                          Attendees ({transcriptData.meetingInfo.attendees.length})
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {transcriptData.meetingInfo.attendees.map((attendee, index) => (
                            <Chip
                              key={index}
                              avatar={
                                <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                                  {attendee?.name ? attendee.name.charAt(0).toUpperCase() : 'U'}
                                </Avatar>
                              }
                              label={attendee?.name || attendee?.email || 'Unknown'}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Transcripts */}
                {transcriptData.transcripts?.length > 0 ? (
                  transcriptData.transcripts.map((transcript, transcriptIndex) => (
                    <Box key={transcript?.id || transcriptIndex} sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Transcript {transcriptIndex + 1}
                        <Chip
                          label={`${transcript?.entries?.length || 0} entries`}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Typography>
                      {transcript?.createdDateTime && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Created: {formatTime(transcript.createdDateTime)}
                        </Typography>
                      )}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <List sx={{ bgcolor: 'background.paper' }}>
                        {transcript?.entries?.map((entry, entryIndex) => (
                          <ListItem
                            key={entryIndex}
                            alignItems="flex-start"
                            sx={{
                              borderLeft: '3px solid',
                              borderLeftColor: entry?.speaker ? 'primary.main' : 'grey.300',
                              mb: 1,
                              bgcolor: entry?.speaker ? 'action.hover' : 'transparent',
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box>
                                  {entry?.speaker && (
                                    <Typography
                                      component="span"
                                      variant="subtitle2"
                                      color="primary"
                                      sx={{ fontWeight: 600, mr: 1 }}
                                    >
                                      {entry.speaker}:
                                    </Typography>
                                  )}
                                  <Typography component="span" variant="body1">
                                    {entry?.text || 'No content available'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                entry?.startTime && entry?.endTime ? (
                                  <Typography variant="caption" color="text.secondary">
                                    {entry.startTime} - {entry.endTime}
                                  </Typography>
                                ) : null
                              }
                            />
                          </ListItem>
                        )) || (
                          <ListItem>
                            <ListItemText primary="No transcript entries available" />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  ))
                ) : (
                  <Alert severity="info">
                    No transcript entries found for this meeting.
                  </Alert>
                )}
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
              Please log in with your Microsoft account to access meeting transcripts.
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
            MoM Bot Transcript Service - Powered by Microsoft Graph API
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default App;