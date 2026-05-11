import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
  ListItemIcon,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  History,
  Delete,
  Edit,
  MoreVert,
  Add,
  Archive,
} from '@mui/icons-material';
import { aiAPI, conversationAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  conversation_id?: string;
}

interface Conversation {
  conversation_id: string;
  title?: string;
  context_type: string;
  message_count: number;
  is_active: boolean;
  created_at: string;
  last_activity_at: string;
}


const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; conversationId: string } | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Custom formatter for AI responses
  const formatAIResponse = (content: string) => {
    // Helper function to format text with bold patterns
    const formatText = (text: string, lineIndex: number) => {
      const parts = [];
      let lastIndex = 0;
      let keyIndex = 0;
      
      // Find all bold patterns **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      
      // Reset regex state
      boldRegex.lastIndex = 0;
      
      while ((match = boldRegex.exec(text)) !== null) {
        // Add any text before this match
        if (match.index > lastIndex) {
          const beforeText = text.substring(lastIndex, match.index);
          if (beforeText) {
            parts.push(
              <span key={`text-${lineIndex}-${keyIndex++}`}>{beforeText}</span>
            );
          }
        }
        
        // Add the bold text
        parts.push(
          <Box
            key={`bold-${lineIndex}-${keyIndex++}`}
            component="strong"
            sx={{ color: 'primary.main', fontWeight: 'bold' }}
          >
            {match[1]}
          </Box>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add any remaining text after the last match
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
          parts.push(
            <span key={`text-${lineIndex}-${keyIndex++}`}>{remainingText}</span>
          );
        }
      }
      
      return parts.length > 0 ? parts : [text];
    };

    // Split content by lines and format each line
    return content.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <br key={index} />;
      
      // Handle headers (### or ## or patterns like **Header:**)
      if (trimmedLine.startsWith('###')) {
        return (
          <Typography key={index} variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
            {trimmedLine.replace(/^#+\s*/, '')}
          </Typography>
        );
      }
      
      if (trimmedLine.startsWith('##')) {
        return (
          <Typography key={index} variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
            {trimmedLine.replace(/^#+\s*/, '')}
          </Typography>
        );
      }
      
      // Handle bold headers like **Header:** or **Section Name**
      if (/^\*\*([^\*]+)\*\*\s*:?\s*$/.test(trimmedLine)) {
        const headerText = trimmedLine.replace(/^\*\*([^\*]+)\*\*\s*:?\s*$/, '$1');
        return (
          <Typography key={index} variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
            {headerText}
          </Typography>
        );
      }
      
      // Handle bullet points
      if (trimmedLine.match(/^[\*\-]\s/)) {
        const content = trimmedLine.replace(/^[\*\-]\s/, '');
        const formattedContent = formatText(content, index);
        return (
          <Typography key={index} variant="body2" sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start' }}>
            <Box component="span" sx={{ marginRight: '8px', color: 'primary.main', fontWeight: 'bold' }}>•</Box>
            <span>{formattedContent}</span>
          </Typography>
        );
      }
      
      // Handle numbered lists
      if (trimmedLine.match(/^\d+\./)) {
        return (
          <Typography key={index} variant="body2" sx={{ mb: 0.5, ml: 1 }}>
            {trimmedLine}
          </Typography>
        );
      }
      
      // Check if line has any formatting (bold text)
      if (/\*\*.*?\*\*/.test(trimmedLine)) {
        return (
          <Typography key={index} variant="body1" sx={{ mb: 1 }}>
            {formatText(trimmedLine, index)}
          </Typography>
        );
      }
      
      // Regular text
      return (
        <Typography key={index} variant="body1" sx={{ mb: 1 }}>
          {trimmedLine}
        </Typography>
      );
    });
  };

  const suggestedQuestions = t('aiAssistant.questions', { returnObjects: true }) as string[];

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation messages when current conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    } else {
      // Show welcome message for new conversation
      setMessages([{
        id: '1',
        type: 'ai',
        content: t('aiAssistant.welcomeMessage'),
        timestamp: new Date(),
      }]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await conversationAPI.getConversations();
      console.log('Loaded conversations:', data); // Debug log
      setConversations(data);
      
      // Don't auto-select any conversation - always start with a new chat
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setError(`${t('aiAssistant.errorLoadConversations')}: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await conversationAPI.getConversationMessages(conversationId);
      console.log('Loaded conversation messages:', data); // Debug log
      
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id.toString(),
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        conversation_id: conversationId,
      }));
      
      setMessages(formattedMessages);
    } catch (err: any) {
      console.error('Failed to load conversation messages:', err);
      setError(`${t('aiAssistant.errorLoadMessages')}: ${err.response?.data?.detail || err.message}`);
      // Set empty messages on error to avoid showing stale data
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{
      id: '1',
      type: 'ai',
      content: t('aiAssistant.welcomeMessage'),
      timestamp: new Date(),
    }]);
  };

  const handleConversationSelect = (conversationId: string) => {
    console.log('Selecting conversation:', conversationId); // Debug log
    setCurrentConversationId(conversationId);
    setError(''); // Clear any previous errors
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await conversationAPI.deleteConversation(conversationId);
      await loadConversations();
      
      // If deleted conversation was selected, create new conversation
      if (currentConversationId === conversationId) {
        createNewConversation();
      }
    } catch (err: any) {
      setError(t('aiAssistant.errorDelete'));
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await conversationAPI.archiveConversation(conversationId);
      await loadConversations();
    } catch (err: any) {
      setError(t('aiAssistant.errorArchive'));
    }
  };

  const handleEditTitle = async (conversationId: string, title: string) => {
    try {
      await conversationAPI.updateConversationTitle(conversationId, title);
      await loadConversations();
      setEditingTitle(null);
      setNewTitle('');
    } catch (err: any) {
      setError(t('aiAssistant.errorUpdateTitle'));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversationId: string) => {
    setMenuAnchor({ element: event.currentTarget, conversationId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSendMessage = async () => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
      conversation_id: currentConversationId || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const requestData: any = { query };
      if (currentConversationId) {
        requestData.conversation_id = currentConversationId;
      }
      
      const response = await aiAPI.query(requestData);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        conversation_id: response.conversation_id,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // If this was a new conversation, update the current conversation ID and reload conversations
      if (!currentConversationId && response.conversation_id) {
        setCurrentConversationId(response.conversation_id);
        await loadConversations();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('aiAssistant.errorAiResponse'));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuery(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>
          {t('aiAssistant.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={createNewConversation}
        >
          {t('aiAssistant.newChat')}
        </Button>
      </Box>

      <Box display="flex" gap={3} height="calc(100vh - 200px)">
        {/* Conversation History Sidebar */}
        <Card sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1, p: 2 }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <History sx={{ mr: 1 }} />
              {t('aiAssistant.history')}
            </Typography>
            
            {loadingConversations ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List dense sx={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                {conversations.map((conversation) => (
                  <ListItem
                    key={conversation.conversation_id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleMenuOpen(e, conversation.conversation_id)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      selected={currentConversationId === conversation.conversation_id}
                      onClick={() => handleConversationSelect(conversation.conversation_id)}
                      sx={{ pr: 6 }}
                    >
                      <ListItemText
                        primary={
                          editingTitle === conversation.conversation_id ? (
                            <TextField
                              size="small"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onBlur={() => handleEditTitle(conversation.conversation_id, newTitle)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditTitle(conversation.conversation_id, newTitle);
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            conversation.title || t('common.untitled')
                          )
                        }
                        secondary={`${conversation.message_count} ${t('aiAssistant.messages')} • ${new Date(conversation.last_activity_at).toLocaleDateString()}`}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'textSecondary'
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
                
                {conversations.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={t('aiAssistant.noConversations')}
                      secondary={t('aiAssistant.startNew')}
                      primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                mb: 2,
                maxHeight: 'calc(100vh - 350px)',
              }}
            >
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Paper
                    elevation={1}
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        backgroundColor: message.type === 'user' 
                          ? 'primary.main' 
                          : (isDarkMode ? 'grey.800' : 'grey.100'),
                        color: message.type === 'user' ? 'white' : 'text.primary',
                        borderRadius: message.type === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                        boxShadow: 2,
                      }}
                  >
                    <Box display="flex" alignItems="center" mb={1}>
                      {message.type === 'ai' ? (
                        <SmartToy sx={{ mr: 1, fontSize: 20 }} />
                      ) : (
                        <Person sx={{ mr: 1, fontSize: 20 }} />
                      )}
                      <Typography variant="caption">
                        {message.type === 'ai' ? t('common.aiAssistant') : t('common.you')}
                      </Typography>
                    </Box>
<Box component="div">
                      {message.type === 'ai' ? formatAIResponse(message.content) : (
                        <Typography variant="body1">
                          {message.content}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              
              {loading && (
                <Box display="flex" justifyContent="flex-start" mb={2}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      backgroundColor: isDarkMode ? 'grey.800' : 'grey.100',
                      borderRadius: '16px 16px 16px 0',
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography variant="body2">{t('aiAssistant.thinking')}</Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Input Area */}
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder={t('aiAssistant.inputPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={loading || !query.trim()}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                <Send />
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <Card sx={{ width: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('aiAssistant.suggestedQuestions')}
            </Typography>
            <List dense>
              {suggestedQuestions.map((question, index) => (
                <ListItem
                  key={index}
                  button
                  onClick={() => handleSuggestedQuestion(question)}
                  sx={{ 
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={question}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t('aiAssistant.quickActions.title')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Chip
                label={t('aiAssistant.quickActions.analyzeLatest')}
                clickable
                color="primary"
                onClick={() => setQuery(t('aiAssistant.quickActions.analyzeLatest'))}
              />
              <Chip
                label={t('aiAssistant.quickActions.recommendations')}
                clickable
                color="secondary"
                onClick={() => setQuery(t('aiAssistant.quickActions.recommendations'))}
              />
              <Chip
                label={t('aiAssistant.quickActions.riskAssessment')}
                clickable
                onClick={() => setQuery(t('aiAssistant.quickActions.riskAssessment'))}
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="textSecondary">
              💡 <strong>{t('aiAssistant.tips.title')}</strong>
              <br />
              • {t('aiAssistant.tips.item1')}
              <br />
              • {t('aiAssistant.tips.item2')}
              <br />
              • {t('aiAssistant.tips.item3')}
              <br />
              • {t('aiAssistant.tips.item4')}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Conversation Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              const conversation = conversations.find(c => c.conversation_id === menuAnchor.conversationId);
              if (conversation) {
                setEditingTitle(conversation.conversation_id);
                setNewTitle(conversation.title || '');
              }
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          {t('common.rename')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              handleArchiveConversation(menuAnchor.conversationId);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Archive fontSize="small" />
          </ListItemIcon>
          {t('common.archive')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              handleDeleteConversation(menuAnchor.conversationId);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AIAssistant;