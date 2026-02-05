// API base URL - always use Render backend since auth redirect URI is configured for it
const API_BASE_URL = 'https://mom-bot-transcript-service.onrender.com';

// Helper function to get test_mode from URL parameters
const getTestModeFromUrl = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const testModeParam = urlParams.get('test_mode');
  // Default to true if not specified, or if explicitly set to 'true'
  return testModeParam === null || testModeParam === 'true';
};

// Helper function to generate analyze API URLs with dynamic test_mode
const getAnalyzeApiUrls = (): string[] => {
  const testMode = getTestModeFromUrl();
  const baseUrls = [
    'http://localhost:8000/api/v1/analyze',
    'http://127.0.0.1:8000/api/v1/analyze',
    'http://0.0.0.0:8000/api/v1/analyze'
  ];

  return baseUrls.map(url => `${url}?test_mode=${testMode}&llm_timeout=60&user_lookup_timeout=30`);
};

export interface TranscriptData {
  meetingInfo: {
    id: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    attendees: Array<{
      name: string;
      email: string;
    }>;
  };
  transcripts: Array<{
    id: string;
    createdDateTime: string;
    entries: Array<{
      startTime: string;
      endTime: string;
      text: string;
      speaker?: string;
    }>;
  }>;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    displayName: string;
    email: string;
  };
  loginUrl?: string;
}

export interface AnalyzeResponseData {
  mode?: string;
  page_url?: string;
  html?: string; // HTML content when test_mode is true
}

export interface AnalyzeResponse {
  data?: AnalyzeResponseData;
  [key: string]: unknown; // For other response fields
}

export interface MeetingProcessResult {
  success: boolean;
  data?: TranscriptData;
  analyzeResponse?: AnalyzeResponse;
  error?: string;
}

export class MeetingService {
  static async checkAuthStatus(): Promise<AuthStatus> {
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

      return data;
    } catch (err) {
      console.error('Auth status check failed:', err);
      return { authenticated: false };
    }
  }

  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' });
    } catch (err) {
      console.error('Logout failed:', err);
      throw err;
    }
  }

  static async fetchAndAnalyzeMeeting(
    meetingUrl: string,
    meetingTitle: string
  ): Promise<MeetingProcessResult> {
    try {
      // Step 1: Fetch transcript
      console.log('🔄 Step 1: Fetching transcript...');
      const response = await fetch(`${API_BASE_URL}/transcript/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ joinUrl: meetingUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('❌ Step 1 Failed: Transcript fetch failed');
        return {
          success: false,
          error: data.message || 'Failed to fetch transcript'
        };
      }

      console.log('✅ Step 1 Complete: Transcript fetched successfully');
      console.log('📋 Meeting Info:', data.data?.meetingInfo);

      // Step 2: Analyze meeting data
      console.log('🔄 Step 2: Analyzing meeting data...');
      console.log('📤 Sending analyze request with transcript data as payload:', data.data);

      const testMode = getTestModeFromUrl();
      console.log(`🔧 Using test_mode: ${testMode}`);

      let analyzeResponse;
      let analyzeData;
      let lastError: Error | null = null;

      // Try multiple API URLs in case the service is running on different addresses
      const analyzeUrls = getAnalyzeApiUrls();
      for (const apiUrl of analyzeUrls) {
        try {
          console.log(`🌐 Trying analyze API URL: ${apiUrl}`);

          // Make analyze API call using the transcript data as payload
          analyzeResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "accept": "application/json",
              "accept-language": "en-IN,en-US;q=0.9,en-GB;q=0.8,en;q=0.7,ta;q=0.6,kn;q=0.5",
              "content-type": "application/json"
            },
            mode: "cors",
            credentials: "omit",
            body: JSON.stringify(data.data)
          });

          console.log(`📊 Analyze response from ${apiUrl}:`, analyzeResponse.status, analyzeResponse.statusText);
          console.log('📊 Analyze response headers:', Object.fromEntries(analyzeResponse.headers.entries()));

          analyzeData = await analyzeResponse.json();
          console.log('📊 Analyze raw response data:', analyzeData);

          // If we got here, the call succeeded, so break out of the loop
          break;
        } catch (analyzeError) {
          console.warn(`⚠️ Failed to connect to ${apiUrl}:`, analyzeError);
          lastError = analyzeError instanceof Error ? analyzeError : new Error('Unknown error');
          // Continue to try the next URL
        }
      }

      // If all URLs failed, return error
      if (!analyzeResponse) {
        console.error('❌ Step 2 Network Error: Failed to call analyze API on all URLs');

        // Still return success with transcript data even if analysis fails due to network error
        return {
          success: true,
          data: data.data,
          error: `Analysis failed - could not connect to any analyze API endpoints. Last error: ${lastError?.message || 'Unknown network error'}. Transcript was fetched successfully.`
        };
      }

      if (analyzeResponse.ok) {
        console.log('✅ Step 2 Complete: Meeting analysis successful!');
        console.log('🎉 MEETING ANALYSIS RESPONSE:');
        console.log('==========================================');
        console.log('📊 Analysis Result:', analyzeData);
        console.log('==========================================');

        // Log original transcript data for reference
        console.log('📝 Original Transcript Data:');
        console.log('==========================================');
        console.log(`📋 Meeting: ${meetingTitle}`);
        if (data.data?.transcripts?.length > 0) {
          data.data.transcripts.forEach((transcript: TranscriptData['transcripts'][0], index: number) => {
            console.log(`\n📄 Transcript Section ${index + 1}:`);
            console.log(`Created: ${transcript?.createdDateTime || 'Unknown'}`);
            console.log('Entries:');
            transcript?.entries?.forEach((entry: TranscriptData['transcripts'][0]['entries'][0], entryIndex: number) => {
              console.log(`${entryIndex + 1}. [${entry?.startTime || '00:00'} - ${entry?.endTime || '00:00'}] ${entry?.speaker ? `${entry.speaker}: ` : ''}${entry?.text || 'No content'}`);
            });
          });
        }
        console.log('\n==========================================');

        return {
          success: true,
          data: data.data,
          analyzeResponse: analyzeData
        };
      } else {
        console.error('❌ Step 2 Failed: Analysis request failed');
        console.error('Analysis error response:', analyzeData);

        // Still return success with transcript data even if analysis fails
        return {
          success: true,
          data: data.data,
          analyzeResponse: analyzeData,
          error: `Analysis failed: ${analyzeData?.message || 'Unknown error'}, but transcript was fetched successfully`
        };
      }
    } catch (err: unknown) {
      console.error('❌ Error in meeting summary process:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during the process';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static getLoginUrl(): string {
    return `${API_BASE_URL}/auth/login`;
  }

  // Utility method to test analyze API connectivity
  static async testAnalyzeApiConnectivity(): Promise<{ success: boolean; workingUrl?: string; error?: string }> {
    console.log('🔍 Testing analyze API connectivity...');

    const analyzeUrls = getAnalyzeApiUrls();
    for (const apiUrl of analyzeUrls) {
      try {
        console.log(`🌐 Testing connection to: ${apiUrl.split('?')[0]}`);

        // Make a simple GET request to test connectivity (or OPTIONS for CORS preflight)
        const response = await fetch(apiUrl.split('?')[0], {
          method: 'OPTIONS',
          mode: 'cors',
        });

        console.log(`✅ Successfully connected to: ${apiUrl.split('?')[0]} (Status: ${response.status})`);
        return { success: true, workingUrl: apiUrl };
      } catch (error) {
        console.warn(`❌ Failed to connect to: ${apiUrl.split('?')[0]}`, error);
      }
    }

    return {
      success: false,
      error: 'Could not connect to any analyze API endpoints. Make sure the Python service is running on port 8000.'
    };
  }
}