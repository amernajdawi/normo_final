import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Button,
  Collapse,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Gavel as LegalIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EnhancedAssistantMessageProps {
  content: string;
}

const EnhancedAssistantMessage: React.FC<EnhancedAssistantMessageProps> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  
  const parts = content.split('---DETAILED---');
  const shortAnswer = parts[0]?.trim() || content;
  const detailedAnswer = parts[1]?.trim() || '';
  const hasDetailedAnswer = parts.length > 1 && detailedAnswer;
  
  const detailedSections = hasDetailedAnswer ? parseContent(detailedAnswer) : [];

  return (
    <Box>
      <Box sx={{ p: 2.5, bgcolor: '#2a2a2a' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={getMarkdownComponents()}
        >
          {shortAnswer}
        </ReactMarkdown>
        {hasDetailedAnswer && (
          <Button
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              mt: 2,
              color: '#10a37f',
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(16, 163, 127, 0.1)' }
            }}
          >
            {expanded ? 'Show less' : 'Show detailed explanation'}
          </Button>
        )}
      </Box>
      
      {hasDetailedAnswer && (
        <Collapse in={expanded}>
          {detailedSections.map((section, index) => (
        <React.Fragment key={index}>
          {section.type === 'summary' && (
            <Box sx={{ p: 2.5, bgcolor: '#2a2a2a' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={getMarkdownComponents()}
              >
                {section.content}
              </ReactMarkdown>
            </Box>
          )}
          
          {section.type === 'calculation' && (
            <Box sx={{ p: 2.5, bgcolor: '#1a1a1a', borderTop: '2px solid #ff9800' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalculateIcon sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600 }}>
                  Calculations & Formulas
                </Typography>
              </Box>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={getMarkdownComponents('calculation')}
              >
                {section.content}
              </ReactMarkdown>
            </Box>
          )}
          
          {section.type === 'table' && (
            <Box sx={{ p: 2.5, bgcolor: '#252525' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {section.headers?.map((header, i) => (
                        <TableCell
                          key={i}
                          sx={{
                            bgcolor: '#10a37f',
                            color: '#ffffff',
                            fontWeight: 700,
                            borderBottom: 'none',
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {section.rows?.map((row, i) => (
                      <TableRow
                        key={i}
                        sx={{
                          '&:nth-of-type(odd)': { bgcolor: '#2a2a2a' },
                          '&:nth-of-type(even)': { bgcolor: '#1e1e1e' },
                        }}
                      >
                        {row.map((cell, j) => (
                          <TableCell
                            key={j}
                            sx={{
                              color: '#ffffff',
                              borderBottom: '1px solid #3d3d3d',
                              fontSize: j === row.length - 1 ? '1.1rem' : '0.95rem',
                              fontWeight: j === row.length - 1 ? 700 : 400,
                            }}
                          >
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {section.type === 'legal' && (
            <Box sx={{ p: 2.5, bgcolor: '#1a2a3a', borderTop: '2px solid #4fc3f7' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LegalIcon sx={{ color: '#4fc3f7', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#4fc3f7', fontWeight: 600 }}>
                  Legal Sources
                </Typography>
              </Box>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={getMarkdownComponents('legal')}
              >
                {section.content}
              </ReactMarkdown>
            </Box>
          )}
          
          {section.type === 'actionable' && (
            <Box sx={{ p: 2.5, bgcolor: '#1a3a1a', borderTop: '2px solid #66bb6a' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon sx={{ color: '#66bb6a', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#66bb6a', fontWeight: 600 }}>
                  Action Items
                </Typography>
              </Box>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={getMarkdownComponents('actionable')}
              >
                {section.content}
              </ReactMarkdown>
            </Box>
          )}
        </React.Fragment>
      ))}
        </Collapse>
      )}
    </Box>
  );
};

interface Section {
  type: string;
  content: string;
  headers?: string[];
  rows?: string[][];
}

function parseContent(content: string): Section[] {
  const sections: Section[] = [];
  
  const calculationPattern = /\*\*Step-by-Step Calculation|\*\*Key Formulas|Formula:|Calculation:|Formel:/i;
  const tablePattern = /\|.*\|.*\|/;
  const legalPattern = /\*\*Legal Sources:|\*\*Document Categories Referenced:/i;
  const actionablePattern = /\*\*Actionable Information:/i;
  
  const lines = content.split('\n');
  let currentSection: Section = { type: 'summary', content: '', headers: [], rows: [] };
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (calculationPattern.test(line) || (currentSection.type === 'summary' && /^\d+\./.test(line) && line.includes('Formula'))) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = { type: 'calculation', content: line + '\n', headers: [], rows: [] };
    } else if (legalPattern.test(line)) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = { type: 'legal', content: line + '\n', headers: [], rows: [] };
    } else if (actionablePattern.test(line)) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = { type: 'actionable', content: line + '\n', headers: [], rows: [] };
    } else if (tablePattern.test(line)) {
      if (!inTable) {
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        inTable = true;
        tableHeaders = line.split('|').map(h => h.trim()).filter(h => h);
        currentSection = { type: 'table', content: '', headers: tableHeaders, rows: [] };
      } else if (line.includes('---')) {
        continue;
      } else {
        const row = line.split('|').map(c => c.trim()).filter(c => c);
        tableRows.push(row);
      }
    } else if (inTable && !tablePattern.test(line)) {
      currentSection.rows = tableRows;
      sections.push({ ...currentSection });
      inTable = false;
      tableHeaders = [];
      tableRows = [];
      currentSection = { type: 'summary', content: line + '\n', headers: [], rows: [] };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  if (inTable) {
    currentSection.rows = tableRows;
  }
  
  if (currentSection.content.trim() || (currentSection.rows && currentSection.rows.length > 0)) {
    sections.push(currentSection);
  }
  
  return sections;
}

function getMarkdownComponents(sectionType?: string) {
  const baseColor = sectionType === 'calculation' ? '#ffcc80' : 
                    sectionType === 'legal' ? '#81d4fa' :
                    sectionType === 'actionable' ? '#a5d6a7' :
                    '#ffffff';
  
  return {
    p: ({ children }: any) => (
      <Typography variant="body1" sx={{ mb: 1.5, lineHeight: 1.7, color: '#e0e0e0', '&:last-child': { mb: 0 } }}>
        {children}
      </Typography>
    ),
    h1: ({ children }: any) => (
      <Typography variant="h5" sx={{ mb: 1.5, mt: 2, fontWeight: 700, color: baseColor }}>
        {children}
      </Typography>
    ),
    h2: ({ children }: any) => (
      <Typography variant="h6" sx={{ mb: 1.5, mt: 1.5, fontWeight: 600, color: baseColor }}>
        {children}
      </Typography>
    ),
    h3: ({ children }: any) => (
      <Typography variant="subtitle1" sx={{ mb: 1, mt: 1, fontWeight: 600, color: baseColor }}>
        {children}
      </Typography>
    ),
    li: ({ children }: any) => (
      <Typography component="li" variant="body1" sx={{ mb: 0.75, lineHeight: 1.6, color: '#e0e0e0' }}>
        {children}
      </Typography>
    ),
    ul: ({ children }: any) => (
      <Box component="ul" sx={{ pl: 2.5, my: 1 }}>
        {children}
      </Box>
    ),
    ol: ({ children }: any) => (
      <Box component="ol" sx={{ pl: 2.5, my: 1 }}>
        {children}
      </Box>
    ),
    strong: ({ children }: any) => (
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          color: sectionType === 'calculation' ? '#ff9800' :
                 sectionType === 'legal' ? '#4fc3f7' :
                 sectionType === 'actionable' ? '#66bb6a' :
                 '#10a37f',
          bgcolor: sectionType ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          px: sectionType ? 0.5 : 0,
          borderRadius: 0.5,
        }}
      >
        {children}
      </Typography>
    ),
    code: ({ children }: any) => (
      <Box
        component="code"
        sx={{
          bgcolor: '#1a1a1a',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.9rem',
          fontFamily: 'monospace',
          color: '#ff9800',
          border: '1px solid #3d3d3d',
        }}
      >
        {children}
      </Box>
    ),
    pre: ({ children }: any) => (
      <Paper
        sx={{
          bgcolor: '#1a1a1a',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          my: 2,
          border: '1px solid #3d3d3d',
        }}
      >
        {children}
      </Paper>
    ),
    blockquote: ({ children }: any) => (
      <Box
        sx={{
          borderLeft: `4px solid ${baseColor}`,
          pl: 2,
          py: 1,
          my: 2,
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          fontStyle: 'italic',
          color: '#b0b0b0',
        }}
      >
        {children}
      </Box>
    ),
  };
}

export default EnhancedAssistantMessage;

