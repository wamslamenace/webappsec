"""
PDF Report Generator for VulnPatch AI
"""
import base64
from io import BytesIO
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white, red, orange, yellow, green
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors
from datetime import datetime
from typing import List, Dict, Any
import os
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for Docker

TRANSLATIONS = {
    'en': {
        'report_title': 'VulnPatch AI',
        'subtitle': 'Intelligent Vulnerability Assessment Report',
        'generated': 'Report Generated:',
        'target': 'Scan Target:',
        'date': 'Scan Date:',
        'type': 'Report Type:',
        'model': 'AI Model:',
        'comp_assessment': 'Comprehensive Vulnerability Assessment',
        'confidential': 'CONFIDENTIAL DOCUMENT',
        'distribution': 'This vulnerability assessment report contains sensitive security information. Distribution should be limited to authorized personnel only.',
        'methodology': 'Report Methodology:',
        'method_1': 'Automated vulnerability scanning and detection',
        'method_2': 'AI-powered risk assessment using Large Language Models',
        'method_3': 'Intelligent prioritization based on exploit potential',
        'notice': 'Important Notice:',
        'disclaimer': 'The findings and recommendations in this report are based on automated scanning and AI analysis. All recommendations should be validated by qualified security professionals before implementation.',
        'exec_summary': 'Executive Summary',
        'exec_text_1': 'This vulnerability assessment identified <b><font color="#d32f2f">{total}</font></b> security vulnerabilities across the scanned network infrastructure. The automated analysis, enhanced by <b>Large Language Model (LLM)</b> capabilities, provides intelligent prioritization and actionable remediation guidance.',
        'key_stats': 'Key Statistics:',
        'critical': 'Critical',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'immediate_action': 'vulnerabilities requiring immediate action',
        'urgent_attention': 'vulnerabilities needing urgent attention',
        'address_soon': 'vulnerabilities to address soon',
        'routine_maint': 'vulnerabilities for routine maintenance',
        'severity_level': 'Severity Level',
        'count': 'Count',
        'percentage': 'Percentage',
        'risk_impact': 'Risk Impact',
        'immediate_req': 'Immediate Action Required',
        'within_48h': 'Address Within 48 Hours',
        'within_1w': 'Address Within 1 Week',
        'during_maint': 'Address During Maintenance',
        'key_recom': 'Key Recommendations:',
        'recom_1': '<b>Immediate Action:</b> Address all critical vulnerabilities within 24 hours',
        'recom_2': '<b>Patch Management:</b> Implement automated patch deployment for routine updates',
        'recom_3': '<b>Continuous Monitoring:</b> Establish regular vulnerability scanning schedule',
        'recom_4': '<b>Risk Assessment:</b> Prioritize patches based on CVSS scores and business impact',
        'recom_5': '<b>Documentation:</b> Maintain detailed records of all remediation activities',
        'vuln_overview': 'Vulnerability Overview',
        'service': 'Service',
        'version': 'Version',
        'port': 'Port',
        'vulnerabilities': 'Vulnerabilities',
        'highest_severity': 'Highest Severity',
        'unknown': 'Unknown',
        'chart_title': 'Vulnerability Distribution by Severity',
        'chart_ylabel': 'Number of Vulnerabilities',
        'chart_xlabel': 'Severity Level',
        'detailed_analysis': 'Detailed Vulnerability Analysis',
        'severity_tag': 'Severity',
        'cve_id': 'CVE ID:',
        'cvss_score': 'CVSS Score:',
        'description': 'Description:',
        'ai_recommendations': 'AI-Enhanced Recommendations:',
        'remediation_commands': 'Remediation Commands:',
        'requires_sudo': '[REQUIRES SUDO]',
        'destructive': '[DESTRUCTIVE]',
        'no_desc': 'No description available.',
        'no_recom': 'No specific recommendation available.',
        'ai_insights': 'AI-Enhanced Security Insights',
        'ai_analysis_summary': '<b>Intelligent Vulnerability Analysis:</b><br/><br/>This section provides AI-powered insights generated using Large Language Models (LLMs) to enhance traditional vulnerability scanning results. The analysis includes contextual risk assessment, exploit likelihood evaluation, and intelligent remediation prioritization.',
        'ai_risk_prioritization': '🤖 AI Risk Prioritization',
        'auto_risk_assessment': '<b>Automated Risk Assessment:</b><br/>• <font color="#d32f2f"><b>{critical}</b></font> critical vulnerabilities identified with high exploit potential<br/>• <font color="#f57c00"><b>{high}</b></font> high-severity vulnerabilities requiring urgent attention<br/>• AI models indicate these vulnerabilities pose significant security risks based on:<br/> • Known exploit availability and attack patterns<br/> • Service exposure and accessibility<br/> • Potential business impact assessment<br/> • Historical vulnerability exploitation trends',
        'intel_remediation': '🧠 Intelligent Remediation Strategy',
        'ai_remediation_approach': '<b>AI-Generated Remediation Approach:</b><br/><br/>The following strategy has been developed using advanced AI analysis of your specific vulnerability profile and industry best practices:<br/><br/><b>1. Immediate Response (0-24 hours):</b><br/>• Focus on critical vulnerabilities with known active exploits<br/>• Implement temporary mitigations for services that cannot be immediately patched<br/>• Enhance monitoring for affected systems<br/><br/><b>2. Short-term Actions (1-7 days):</b><br/>• Deploy tested patches for high and medium severity vulnerabilities<br/>• Conduct vulnerability re-scanning to verify remediation effectiveness<br/>• Update security controls and configurations<br/><br/><b>3. Long-term Improvements (1-4 weeks):</b><br/>• Implement automated patch management processes<br/>• Establish continuous vulnerability monitoring<br/>• Enhance security architecture based on identified weaknesses',
        'tech_analysis_highlights': '⚙️ Technical Analysis Highlights',
        'auto_tech_assessment': '<b>Automated Technical Assessment:</b><br/>• <b>Attack Surface:</b> {services} unique services identified with vulnerabilities<br/>• <b>Risk Concentration:</b> Average CVSS score of {avg:.1f}/10 across all findings<br/>• <b>Patch Complexity:</b> Multiple service types requiring coordinated remediation approach<br/>• <b>Business Impact:</b> Potential for service disruption during patching activities<br/><br/><b>AI-Recommended Testing Strategy:</b><br/>• Prioritize patches based on exploitability and business criticality<br/>• Implement staged rollout approach for production systems<br/>• Maintain detailed rollback procedures for all changes<br/>• Monitor system performance and security posture post-remediation',
        'patch_management': 'Patch Management Recommendations',
        'patch_priority_matrix': '<b>Patching Priority Matrix:</b><br/><br/>The following recommendations are based on automated analysis using Large Language Models (LLMs) to assess vulnerability impact, exploitability, and business risk:',
        'immediate_action_header': '🔴 IMMEDIATE ACTION REQUIRED (24 hours)',
        'high_priority_header': '🟡 HIGH PRIORITY (48-72 hours)',
        'conclusion': 'Conclusion'
    },
    'fr': {
        'report_title': 'VulnPatch AI',
        'subtitle': 'Rapport d\'Évaluation Intelligente des Vulnérabilités',
        'generated': 'Rapport Généré le :',
        'target': 'Cible du Scan :',
        'date': 'Date du Scan :',
        'type': 'Type de Rapport :',
        'model': 'Modèle d\'IA :',
        'comp_assessment': 'Évaluation Complète des Vulnérabilités',
        'confidential': 'DOCUMENT CONFIDENTIEL',
        'distribution': 'Ce rapport d\'évaluation des vulnérabilités contient des informations de sécurité sensibles. La distribution doit être limitée au personnel autorisé uniquement.',
        'methodology': 'Méthodologie du Rapport :',
        'method_1': 'Scan et détection automatisés des vulnérabilités',
        'method_2': 'Évaluation des risques assistée par IA via des modèles de langage (LLM)',
        'method_3': 'Priorisation intelligente basée sur le potentiel d\'exploitation',
        'notice': 'Avis Important :',
        'disclaimer': 'Les conclusions et recommandations de ce rapport sont basées sur un scan automatisé et une analyse par IA. Toutes les recommandations doivent être validées par des professionnels de la sécurité qualifiés avant mise en œuvre.',
        'exec_summary': 'Résumé Exécutif',
        'exec_text_1': 'Cette évaluation a identifié <b><font color="#d32f2f">{total}</font></b> vulnérabilités de sécurité sur l\'infrastructure réseau scannée. L\'analyse automatisée, enrichie par les capacités des <b>Modèles de Langage (LLM)</b>, fournit une priorisation intelligente et des conseils de remédiation exploitables.',
        'key_stats': 'Statistiques Clés :',
        'critical': 'Critique',
        'high': 'Élevé',
        'medium': 'Moyen',
        'low': 'Faible',
        'immediate_action': 'vulnérabilités nécessitant une action immédiate',
        'urgent_attention': 'vulnérabilités nécessitant une attention urgente',
        'address_soon': 'vulnérabilités à traiter prochainement',
        'routine_maint': 'vulnérabilités pour maintenance de routine',
        'severity_level': 'Niveau de Sévérité',
        'count': 'Nombre',
        'percentage': 'Pourcentage',
        'risk_impact': 'Impact sur le Risque',
        'immediate_req': 'Action Immédiate Requise',
        'within_48h': 'À traiter sous 48 Heures',
        'within_1w': 'À traiter sous 1 Semaine',
        'during_maint': 'À traiter lors de la maintenance',
        'key_recom': 'Recommandations Clés :',
        'recom_1': '<b>Action Immédiate :</b> Traiter toutes les vulnérabilités critiques sous 24 heures',
        'recom_2': '<b>Gestion des Patchs :</b> Mettre en œuvre un déploiement automatisé des correctifs',
        'recom_3': '<b>Surveillance Continue :</b> Établir un calendrier régulier de scans de vulnérabilités',
        'recom_4': '<b>Évaluation des Risques :</b> Prioriser les patchs selon les scores CVSS et l\'impact métier',
        'recom_5': '<b>Documentation :</b> Maintenir des registres détaillés de toutes les activités de remédiation',
        'vuln_overview': 'Aperçu des Vulnérabilités',
        'service': 'Service',
        'version': 'Version',
        'port': 'Port',
        'vulnerabilities': 'Vulnérabilités',
        'highest_severity': 'Sévérité Maximale',
        'unknown': 'Inconnu',
        'chart_title': 'Distribution des Vulnérabilités par Sévérité',
        'chart_ylabel': 'Nombre de Vulnérabilités',
        'chart_xlabel': 'Niveau de Sévérité',
        'detailed_analysis': 'Analyse Détaillée des Vulnérabilités',
        'severity_tag': 'Sévérité',
        'cve_id': 'ID CVE :',
        'cvss_score': 'Score CVSS :',
        'description': 'Description :',
        'ai_recommendations': 'Recommandations Enrichies par l\'IA :',
        'remediation_commands': 'Commandes de Remédiation :',
        'requires_sudo': '[NÉCESSITE SUDO]',
        'destructive': '[DESTRUCTIF]',
        'no_desc': 'Aucune description disponible.',
        'no_recom': 'Aucune recommandation spécifique disponible.',
        'ai_insights': 'Analyses de Sécurité par IA',
        'ai_analysis_summary': '<b>Analyse Intelligente des Vulnérabilités :</b><br/><br/>Cette section fournit des analyses générées par IA pour enrichir les résultats des scans traditionnels. L\'analyse inclut l\'évaluation contextuelle des risques et la priorisation intelligente.',
        'ai_risk_prioritization': '🤖 Priorisation des Risques par IA',
        'auto_risk_assessment': '<b>Évaluation Automatisée des Risques :</b><br/>• <font color="#d32f2f"><b>{critical}</b></font> vulnérabilités critiques identifiées<br/>• <font color="#f57c00"><b>{high}</b></font> vulnérabilités de sévérité élevée<br/>• L\'IA indique que ces vulnérabilités posent des risques majeurs basés sur :<br/> • La disponibilité d\'exploits connus<br/> • L\'exposition du service<br/> • L\'évaluation de l\'impact métier<br/> • Les tendances historiques d\'exploitation',
        'intel_remediation': '🧠 Stratégie de Remédiation Intelligente',
        'ai_remediation_approach': '<b>Approche de Remédiation Générée par IA :</b><br/><br/>La stratégie suivante a été élaborée selon votre profil spécifique et les meilleures pratiques du secteur :<br/><br/><b>1. Réponse Immédiate (0-24 heures) :</b><br/>• Focus sur les vulnérabilités critiques avec exploits actifs<br/>• Mesures d\'atténuation temporaires si le patch est impossible<br/>• Surveillance accrue des systèmes affectés<br/><br/><b>2. Actions à Court Terme (1-7 jours) :</b><br/>• Déploiement des patchs testés pour les sévérités élevées et moyennes<br/>• Re-scan pour vérifier l\'efficacité de la remédiation<br/>• Mise à jour des contrôles de sécurité<br/><br/><b>3. Améliorations à Long Terme (1-4 semaines) :</b><br/>• Automatisation de la gestion des correctifs<br/>• Établissement d\'une surveillance continue<br/>• Renforcement de l\'architecture de sécurité',
        'tech_analysis_highlights': '⚙️ Points Forts de l\'Analyse Technique',
        'auto_tech_assessment': '<b>Évaluation Technique Automatisée :</b><br/>• <b>Surface d\'Attaque :</b> {services} services uniques affectés<br/>• <b>Concentration des Risques :</b> Score CVSS moyen de {avg:.1f}/10<br/>• <b>Complexité des Patchs :</b> Approche coordonnée requise pour plusieurs services<br/>• <b>Impact Métier :</b> Risque d\'interruption lors des activités de correction<br/><br/><b>Stratégie de Test Recommandée par l\'IA :</b><br/>• Prioriser selon l\'exploitabilité et la criticité métier<br/>• Déploiement par étapes pour les systèmes de production<br/>• Procédures de retour arrière pour chaque changement<br/>• Suivi des performances après remédiation',
        'patch_management': 'Recommandations de Gestion des Correctifs',
        'patch_priority_matrix': '<b>Matrice de Priorité des Correctifs :</b><br/><br/>Les recommandations suivantes sont basées sur une analyse LLM de l\'impact et du risque :',
        'immediate_action_header': '🔴 ACTION IMMÉDIATE REQUISE (24 heures)',
        'high_priority_header': '🟡 PRIORITÉ ÉLEVÉE (48-72 heures)',
        'conclusion': 'Conclusion'
    }
}


class PDFReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom styles for the PDF"""

        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))

        # Header styles
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=HexColor('#1976d2'),
            spaceBefore=20,
            spaceAfter=12,
            borderWidth=0,
            borderColor=HexColor('#1976d2'),
            borderPadding=5
        ))

        # Executive summary style
        self.styles.add(ParagraphStyle(
            name='ExecutiveSummary',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=black,
            spaceBefore=6,
            spaceAfter=6,
            alignment=TA_JUSTIFY
        ))

        # Vulnerability item style
        self.styles.add(ParagraphStyle(
            name='VulnItem',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceBefore=8,
            spaceAfter=4,
            leftIndent=20
        ))

        # Risk assessment styles
        self.styles.add(ParagraphStyle(
            name='HighRisk',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=HexColor('#d32f2f'),
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='MediumRisk',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=HexColor('#f57c00'),
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='LowRisk',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=HexColor('#388e3c'),
            fontName='Helvetica-Bold'
        ))

    def generate_vulnerability_report(
        self,
        scan_data: Dict[str, Any],
        vulnerabilities: List[Dict[str, Any]],
        output_path: str,
        report_type: str = "comprehensive",
        language: str = "fr"
    ) -> str:
        """Generate a comprehensive vulnerability assessment PDF report"""
        
        self.lang = language if language in TRANSLATIONS else 'en'
        self.t = TRANSLATIONS[self.lang]

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )

        # Build the story (content)
        story = []

        # Title Page
        story.extend(self._build_title_page(scan_data))
        story.append(PageBreak())

        # Executive Summary
        story.extend(self._build_executive_summary(vulnerabilities))
        story.append(PageBreak())

        # Vulnerability Overview
        story.extend(self._build_vulnerability_overview(vulnerabilities))

        # Risk Assessment Chart
        chart_path = self._create_risk_chart(vulnerabilities)
        if chart_path:
            story.append(Spacer(1, 20))
            story.append(RLImage(chart_path, width=5*inch, height=3*inch))
            story.append(Spacer(1, 20))

        story.append(PageBreak())

        # AI-Enhanced Insights
        story.extend(self._build_ai_insights_section(vulnerabilities))
        story.append(PageBreak())

        # Detailed Vulnerabilities
        story.extend(self._build_detailed_vulnerabilities(vulnerabilities))
        story.append(PageBreak())

        # Patch Recommendations
        story.extend(self._build_patch_recommendations(vulnerabilities))
        story.append(PageBreak())

        # Risk Assessment Matrix
        story.extend(self._build_risk_assessment(vulnerabilities))

        # Build PDF
        try:
            doc.build(story)
            print(f"PDF successfully created at: {output_path}")

            # Verify the PDF file was created and has content
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"PDF file size: {file_size} bytes")
                if file_size == 0:
                    print("WARNING: PDF file is empty!")
            else:
                print("ERROR: PDF file was not created!")

        except Exception as e:
            print(f"Error building PDF: {e}")
            raise e

        # Clean up temporary chart
        if chart_path and os.path.exists(chart_path):
            try:
                os.remove(chart_path)
            except Exception as e:
                print(f"Warning: Could not clean up chart file: {e}")

        return output_path

    def _build_title_page(self, scan_data: Dict[str, Any]) -> List:
        """Build the title page"""
        story = []

        # Main title
        story.append(Paragraph(self.t['report_title'], self.styles['CustomTitle']))
        story.append(Spacer(1, 12))

        # Subtitle
        story.append(Paragraph(
            self.t['subtitle'],
            self.styles['Heading2']
        ))
        story.append(Spacer(1, 30))

        # Report details table
        report_data = [
            [self.t['generated'], datetime.now().strftime("%B %d, %Y at %I:%M %p")],
            [self.t['target'], scan_data.get('target', 'N/A')],
            [self.t['date'], scan_data.get('scan_date', 'N/A')],
            [self.t['type'], self.t['comp_assessment']],
            [self.t['model'], 'Gemini-2.5-flash:Enhanced']
        ]

        report_table = Table(report_data, colWidths=[2*inch, 4*inch])
        report_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, HexColor('#f5f5f5')]),
            ('BOX', (0, 0), (-1, -1), 1, black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, black),
        ]))

        story.append(report_table)
        story.append(Spacer(1, 50))

        # Disclaimer with better formatting
        disclaimer = f"""
        <b><font color="#d32f2f">{self.t['confidential']}</font></b><br/><br/>
        {self.t['distribution']}<br/><br/>
        
        <b>{self.t['methodology']}</b><br/>
        • {self.t['method_1']}<br/>
        • {self.t['method_2']}<br/>
        • {self.t['method_3']}<br/>
        
        <b><font color="#f57c00">{self.t['notice']}</font></b> {self.t['disclaimer']}
        """
        story.append(Paragraph(disclaimer, self.styles['Normal']))

        return story

    def _build_executive_summary(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build executive summary section"""
        story = []

        story.append(Paragraph(self.t['exec_summary'],
                     self.styles['SectionHeader']))

        # Calculate statistics
        total_vulns = len(vulnerabilities)
        critical = len(
            [v for v in vulnerabilities if v.get('severity') == 'Critical'])
        high = len([v for v in vulnerabilities if v.get('severity') == 'High'])
        medium = len(
            [v for v in vulnerabilities if v.get('severity') == 'Medium'])
        low = len([v for v in vulnerabilities if v.get('severity') == 'Low'])

        # Summary paragraph with enhanced formatting
        summary_text = self.t['exec_text_1'].format(total=total_vulns)
        summary_text += f"""
        <br/><br/>
        <b>{self.t['key_stats']}</b><br/>
        • <font color="#d32f2f"><b>{self.t['critical']}:</b></font> {critical} {self.t['immediate_action']}<br/>
        • <font color="#f57c00"><b>{self.t['high']}:</b></font> {high} {self.t['urgent_attention']}<br/>
        • <font color="#fbc02d"><b>{self.t['medium']}:</b></font> {medium} {self.t['address_soon']}<br/>
        • <font color="#388e3c"><b>{self.t['low']}:</b></font> {low} {self.t['routine_maint']}
        """
        story.append(Paragraph(summary_text, self.styles['ExecutiveSummary']))
        story.append(Spacer(1, 20))

        # Risk breakdown table
        risk_data = [
            [self.t['severity_level'], self.t['count'], self.t['percentage'], self.t['risk_impact']],
            [self.t['critical'], str(critical), f"{(critical/total_vulns*100):.1f}%" if total_vulns >
             0 else "0%", self.t['immediate_req']],
            [self.t['high'], str(high), f"{(high/total_vulns*100):.1f}%" if total_vulns >
             0 else "0%", self.t['within_48h']],
            [self.t['medium'], str(medium), f"{(medium/total_vulns*100):.1f}%" if total_vulns >
             0 else "0%", self.t['within_1w']],
            [self.t['low'], str(low), f"{(low/total_vulns*100):.1f}%" if total_vulns >
             0 else "0%", self.t['during_maint']]
        ]

        risk_table = Table(risk_data, colWidths=[
                           1.5*inch, 1*inch, 1.5*inch, 2.5*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
            ('BOX', (0, 0), (-1, -1), 1, black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, black),
        ]))

        story.append(risk_table)
        story.append(Spacer(1, 20))

        # Key recommendations
        recommendations = f"""
        <b>{self.t['key_recom']}</b><br/>
        1. {self.t['recom_1']}<br/>
        2. {self.t['recom_2']}<br/>
        3. {self.t['recom_3']}<br/>
        4. {self.t['recom_4']}<br/>
        5. {self.t['recom_5']}
        """
        story.append(Paragraph(recommendations,
                     self.styles['ExecutiveSummary']))

        return story

    def _build_vulnerability_overview(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build vulnerability overview section"""
        story = []

        story.append(Paragraph(self.t['vuln_overview'],
                     self.styles['SectionHeader']))

        # Group vulnerabilities by service
        services = {}
        for vuln in vulnerabilities:
            service = vuln.get('service_name', 'Unknown')
            if service not in services:
                services[service] = []
            services[service].append(vuln)

        # Service summary table
        service_data = [[self.t['service'], self.t['version'], self.t['port'],
                         self.t['vulnerabilities'], self.t['highest_severity']]]

        for service, vulns in services.items():
            version = vulns[0].get('version', 'Unknown')
            port = vulns[0].get('port', 'Unknown')
            vuln_count = len(vulns)

            # Determine highest severity
            severity_order = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
            highest_severity = max(
                vulns, key=lambda v: severity_order.get(v.get('severity', 'Low'), 0))

            service_data.append([
                service,
                str(version),
                str(port),
                str(vuln_count),
                highest_severity.get('severity', 'Unknown')
            ])

        service_table = Table(service_data, colWidths=[
                              1.5*inch, 1.2*inch, 0.8*inch, 1*inch, 1.2*inch])
        service_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
            ('BOX', (0, 0), (-1, -1), 1, black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, black),
        ]))

        story.append(service_table)

        return story

    def _create_risk_chart(self, vulnerabilities: List[Dict[str, Any]]) -> str:
        """Create a risk assessment chart"""
        try:
            # Count by severity
            severity_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
            for vuln in vulnerabilities:
                severity = vuln.get('severity', 'Low')
                if severity in severity_counts:
                    severity_counts[severity] += 1

            # Skip chart if no vulnerabilities
            if sum(severity_counts.values()) == 0:
                return None

            # Create chart with explicit figure and axis
            plt.ioff()  # Turn off interactive mode
            _, ax = plt.subplots(figsize=(8, 6))

            severities = list(severity_counts.keys())
            counts = list(severity_counts.values())
            colors_map = {'Critical': '#d32f2f', 'High': '#f57c00',
                          'Medium': '#fbc02d', 'Low': '#388e3c'}
            chart_colors = [colors_map[s] for s in severities]

            bars = ax.bar(severities, counts, color=chart_colors)

            # Customize chart
            ax.set_title(self.t['chart_title'],
                         fontsize=14, fontweight='bold')
            ax.set_ylabel(self.t['chart_ylabel'], fontsize=12)
            ax.set_xlabel(self.t['chart_xlabel'], fontsize=12)

            # Add value labels on bars
            for bar, count in zip(bars, counts):
                if count > 0:
                    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                            str(count), ha='center', va='bottom', fontweight='bold')

            plt.tight_layout()

            # Ensure /tmp directory exists and save to temporary file
            os.makedirs('/tmp', exist_ok=True)
            chart_path = '/tmp/risk_chart.png'
            plt.savefig(chart_path, dpi=300,
                        bbox_inches='tight', facecolor='white')
            plt.close()
            plt.ion()  # Turn interactive mode back on

            # Verify file was created
            if os.path.exists(chart_path) and os.path.getsize(chart_path) > 0:
                return chart_path
            else:
                print("Chart file was not created properly")
                return None

        except Exception as e:
            print(f"Error creating chart: {e}")
            # Clean up any partial matplotlib state
            try:
                plt.close('all')
                plt.ion()
            except:
                pass
            return None

    def _build_detailed_vulnerabilities(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build detailed vulnerabilities section"""
        story = []

        story.append(Paragraph(self.t['detailed_analysis'],
                     self.styles['SectionHeader']))

        # Sort vulnerabilities by severity
        severity_order = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
        sorted_vulns = sorted(vulnerabilities,
                              key=lambda v: severity_order.get(
                                  v.get('severity', 'Low'), 0),
                              reverse=True)

        for i, vuln in enumerate(sorted_vulns, 1):
            # Vulnerability header with color-coded severity
            severity = vuln.get('severity', 'Unknown')
            service = vuln.get('service_name', 'Unknown')
            cve = vuln.get('cve_id', 'N/A')

            # Color-code the severity
            severity_colors = {
                'Critical': '#d32f2f',
                'High': '#f57c00',
                'Medium': '#fbc02d',
                'Low': '#388e3c'
            }
            severity_color = severity_colors.get(severity, '#000000')

            header_text = f"<b>{i}. {service}</b> - <font color='{severity_color}'><b>{severity} {self.t['severity_tag']}</b></font>"
            if cve != 'N/A':
                header_text += f" <font color='blue'>({cve})</font>"

            story.append(Paragraph(header_text, self.styles['Heading3']))
            story.append(Spacer(1, 8))

            # Vulnerability details table with better formatting
            vuln_data = [
                [self.t['service'] + ':', vuln.get('service_name', 'N/A')],
                [self.t['version'] + ':', vuln.get('version', 'N/A')],
                [self.t['port'] + ':', str(vuln.get('port', 'N/A'))],
                [self.t['cve_id'], vuln.get('cve_id', 'N/A')],
                [self.t['cvss_score'],
                    f"{vuln.get('cvss_score', 'N/A')}/10" if vuln.get('cvss_score') else 'N/A'],
                [self.t['severity_tag'] + ':',
                    f"<font color='{severity_color}'><b>{vuln.get('severity', 'N/A')}</b></font>"]
            ]

            vuln_table = Table(vuln_data, colWidths=[1.3*inch, 4.2*inch])
            vuln_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1),
                 [HexColor('#f8f8f8'), white]),
                ('BOX', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))

            story.append(vuln_table)
            story.append(Spacer(1, 12))

            # Description with better formatting
            description = vuln.get('description', 'No description available.')
            formatted_description = self._format_ai_content_for_pdf(
                description)
            story.append(
                Paragraph(f"<b>{self.t['description']}</b>", self.styles['Normal']))
            story.append(Spacer(1, 4))
            story.append(
                Paragraph(formatted_description, self.styles['Normal']))
            story.append(Spacer(1, 10))

            # Recommendation with enhanced formatting
            recommendation = vuln.get(
                'recommendation', 'No specific recommendation available.')
            formatted_recommendation = self._format_ai_content_for_pdf(
                recommendation)
            story.append(
                Paragraph(f"<b>{self.t['ai_recommendations']}</b>", self.styles['Normal']))
            story.append(Spacer(1, 4))
            story.append(
                Paragraph(formatted_recommendation, self.styles['Normal']))
            story.append(Spacer(1, 10))

            # Remediation Commands
            commands = vuln.get('remediation_commands', [])
            if commands:
                story.append(
                    Paragraph(f"<b>{self.t['remediation_commands']}</b>", self.styles['Normal']))
                story.append(Spacer(1, 8))

                for cmd in commands[:3]:  # Limit to 3 commands per vulnerability
                    os_name = cmd.get('os', 'Linux').upper()
                    command_text = cmd.get('command', '')
                    description = cmd.get('description', '')
                    requires_sudo = cmd.get('requires_sudo', False)
                    is_destructive = cmd.get('is_destructive', False)

                    # Command header with OS and warnings - better formatting
                    header_parts = [
                        f"<b><font color='#1976d2'>{os_name}</font></b>"]
                    if requires_sudo:
                        header_parts.append(
                            f"<font color='#d32f2f'><b>{self.t['requires_sudo']}</b></font>")
                    if is_destructive:
                        header_parts.append(
                            f"<font color='#d32f2f'><b>{self.t['destructive']}</b></font>")

                    story.append(
                        Paragraph(" ".join(header_parts), self.styles['Normal']))
                    story.append(Spacer(1, 12))

                    # Command in monospace with better styling
                    command_style = ParagraphStyle(
                        'CommandStyle',
                        parent=self.styles['Normal'],
                        fontName='Courier',
                        fontSize=9,
                        leftIndent=15,
                        rightIndent=15,
                        backgroundColor=HexColor('#f8f8f8'),
                        borderWidth=1,
                        borderColor=HexColor('#ddd'),
                        borderPadding=8,
                        spaceAfter=6
                    )
                    story.append(Paragraph(command_text, command_style))

                    if description:
                        story.append(Spacer(1, 4))
                        story.append(Paragraph(
                            f"<i><font color='#666'>{description}</font></i>", self.styles['Normal']))
                    story.append(Spacer(1, 12))

            story.append(Spacer(1, 15))

        return story

    def _format_ai_content_for_pdf(self, content: str) -> str:
        """Format AI-generated content for better PDF display"""
        if not content:
            return content

        # Split content into lines and process each line
        lines = content.split('\n')
        formatted_lines = []

        for line in lines:
            line = line.strip()
            if not line:
                formatted_lines.append('<br/>')
                continue

            # Handle headers (## or ### or **Header:**)
            if line.startswith('###'):
                header_text = line.replace('###', '').strip()
                formatted_lines.append(
                    f'<br/><b><font color="#1976d2" size="12">{header_text}</font></b><br/><br/>')
            elif line.startswith('##'):
                header_text = line.replace('##', '').strip()
                formatted_lines.append(
                    f'<br/><b><font color="#1976d2" size="14">{header_text}</font></b><br/><br/>')
            # Handle **Header:** patterns
            elif line.startswith('**') and line.endswith(':**') and line.count('**') == 2:
                header_text = line.replace('**', '').replace(':', '').strip()
                formatted_lines.append(
                    f'<br/><b><font color="#1976d2">{header_text}:</font></b><br/>')
            # Handle bullet points starting with * or -
            elif line.startswith('*') and not (line.startswith('**') and line.endswith('**')):
                bullet_text = line[1:].strip()
                # Check for bold formatting **text**
                if '**' in bullet_text:
                    bullet_text = self._process_bold_text(bullet_text)
                formatted_lines.append(f'  • {bullet_text}<br/>')
            elif line.startswith('-') and not line.startswith('--'):
                bullet_text = line[1:].strip()
                # Check for bold formatting **text**
                if '**' in bullet_text:
                    bullet_text = self._process_bold_text(bullet_text)
                formatted_lines.append(f'  • {bullet_text}<br/>')
            # Handle numbered lists
            elif line.split('.')[0].strip().isdigit():
                formatted_lines.append(f'  {line}<br/>')
            # Handle bold text **text**
            elif '**' in line:
                processed_line = self._process_bold_text(line)
                formatted_lines.append(processed_line + '<br/>')
            else:
                # Regular text with proper spacing
                formatted_lines.append(line + '<br/>')

        return '\n'.join(formatted_lines)

    def _process_bold_text(self, text: str) -> str:
        """Process bold text formatting **text**"""
        parts = text.split('**')
        formatted_parts = []
        for i, part in enumerate(parts):
            if i % 2 == 1:  # Odd indices are bold
                formatted_parts.append(f'<b>{part}</b>')
            else:
                formatted_parts.append(part)
        return ''.join(formatted_parts)

    def _build_ai_insights_section(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build AI-enhanced insights section"""
        story = []

        story.append(Paragraph(self.t['ai_insights'],
                     self.styles['SectionHeader']))

        # AI Analysis Summary
        ai_summary = self.t['ai_analysis_summary']
        story.append(Paragraph(ai_summary, self.styles['Normal']))
        story.append(Spacer(1, 15))

        # Priority Analysis
        critical_vulns = [v for v in vulnerabilities if v.get(
            'severity') == 'Critical']
        high_vulns = [v for v in vulnerabilities if v.get(
            'severity') == 'High']

        if critical_vulns or high_vulns:
            story.append(Paragraph(self.t['ai_risk_prioritization'],
                         self.styles['Heading3']))
            story.append(Spacer(1, 8))

            priority_insights = self.t['auto_risk_assessment'].format(
                critical=len(critical_vulns),
                high=len(high_vulns)
            )
            story.append(Paragraph(priority_insights, self.styles['Normal']))
            story.append(Spacer(1, 15))

        # AI Recommendations Summary
        story.append(
            Paragraph(self.t['intel_remediation'], self.styles['Heading3']))
        story.append(Spacer(1, 8))

        remediation_strategy = self.t['ai_remediation_approach']
        story.append(Paragraph(remediation_strategy, self.styles['Normal']))
        story.append(Spacer(1, 15))

        # Technical Insights
        story.append(Paragraph(self.t['tech_analysis_highlights'],
                     self.styles['Heading3']))
        story.append(Spacer(1, 8))

        # Calculate some technical metrics
        services_affected = len(
            set(v.get('service_name', 'Unknown') for v in vulnerabilities))
        avg_cvss = sum(v.get('cvss_score', 0) for v in vulnerabilities if v.get(
            'cvss_score')) / max(len([v for v in vulnerabilities if v.get('cvss_score')]), 1)

        technical_analysis = self.t['auto_tech_assessment'].format(
            services=services_affected,
            avg=avg_cvss
        )
        story.append(Paragraph(technical_analysis, self.styles['Normal']))

        return story

    def _build_patch_recommendations(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build patch recommendations section"""
        story = []

        story.append(Paragraph(self.t['patch_management'],
                     self.styles['SectionHeader']))

        # Priority-based recommendations
        priority_text = self.t['patch_priority_matrix']
        story.append(Paragraph(priority_text, self.styles['Normal']))
        story.append(Spacer(1, 15))

        # Group by urgency
        critical_vulns = [v for v in vulnerabilities if v.get(
            'severity') == 'Critical']
        high_vulns = [v for v in vulnerabilities if v.get(
            'severity') == 'High']

        if critical_vulns:
            story.append(
                Paragraph(self.t['immediate_action_header'], self.styles['HighRisk']))
            story.append(Spacer(1, 8))
            for vuln in critical_vulns:
                service_name = vuln.get('service_name', 'Unknown')
                recommendation = vuln.get(
                    'recommendation', 'Apply latest security patches')
                formatted_rec = self._format_ai_content_for_pdf(recommendation)
                rec_text = f"<b>{service_name}:</b><br/>{formatted_rec}"
                story.append(Paragraph(rec_text, self.styles['VulnItem']))
                story.append(Spacer(1, 8))
            story.append(Spacer(1, 15))

        if high_vulns:
            story.append(Paragraph(self.t['high_priority_header'],
                         self.styles['MediumRisk']))
            story.append(Spacer(1, 8))
            for vuln in high_vulns:
                service_name = vuln.get('service_name', 'Unknown')
                recommendation = vuln.get(
                    'recommendation', 'Apply security updates')
                formatted_rec = self._format_ai_content_for_pdf(recommendation)
                rec_text = f"<b>{service_name}:</b><br/>{formatted_rec}"
                story.append(Paragraph(rec_text, self.styles['VulnItem']))
                story.append(Spacer(1, 8))
            story.append(Spacer(1, 15))

        # General recommendations

        return story

    def _build_risk_assessment(self, vulnerabilities: List[Dict[str, Any]]) -> List:
        """Build risk assessment section"""
        story = []

        story.append(Paragraph(self.t['conclusion'],
                     self.styles['SectionHeader']))

        # Calculate overall risk score
        total_score = 0
        scored_vulns = 0

        for vuln in vulnerabilities:
            cvss = vuln.get('cvss_score')
            if cvss and isinstance(cvss, (int, float)):
                total_score += cvss
                scored_vulns += 1

        avg_score = total_score / scored_vulns if scored_vulns > 0 else 0

        # Risk assessment summary
        risk_summary = f"""
        <b>Overall Risk Assessment:</b><br/>
        Average CVSS Score: {avg_score:.1f}/10<br/>
        Total Vulnerabilities: {len(vulnerabilities)}<br/>
        Risk Level: {"Critical" if avg_score >= 7 else "High" if avg_score >= 4 else "Medium"}<br/><br/>
        """
        story.append(Paragraph(risk_summary, self.styles['Normal']))

        general_recommendations = """
        <b>General Patch Management Best Practices:</b><br/>
        1. <b>Test Environment:</b> Always test patches in a non-production environment first<br/>
        2. <b>Backup Strategy:</b> Ensure complete backups before applying critical patches<br/>
        3. <b>Rollback Plan:</b> Have a documented rollback procedure for each patch<br/>
        4. <b>Change Management:</b> Follow organizational change management processes<br/>
        5. <b>Documentation:</b> Maintain detailed records of all patch activities<br/>
        6. <b>Monitoring:</b> Implement post-patch monitoring to verify system stability
        """
        story.append(Paragraph(general_recommendations, self.styles['Normal']))

        return story
