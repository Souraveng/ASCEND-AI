
\documentclass[lighthipster]{simplehipstercv}
% available options are: darkhipster, lighthipster, pastel, allblack, grey, verylight, withoutsidebar
% withoutsidebar
\usepackage[utf8]{inputenc}
\usepackage[default]{raleway}
\usepackage[margin=1cm, a4paper]{geometry}


%------------------------------------------------------------------ Variables

\newlength{\rightcolwidth}
\newlength{\leftcolwidth}
\setlength{\leftcolwidth}{0.23\textwidth}
\setlength{\rightcolwidth}{0.75\textwidth}

%------------------------------------------------------------------
\title{Resume Template}
\author{\LaTeX{} Template}
\date{} % Date removed

\pagestyle{empty}
\begin{document}


\thispagestyle{empty}
%-------------------------------------------------------------

\section*{Start}

% Header: {Color}{First Name}{Last Name}{Job Title}{Text Color}
\simpleheader{headercolour}{First}{Last}{Current Job Title}{white}



%------------------------------------------------

% this has to be here so the paracols starts..
\subsection*{}
\vspace{4em}

\setlength{\columnsep}{1.5cm}
\columnratio{0.23}[0.75]
\begin{paracol}{2}
\hbadness5000
%\backgroundcolor{c[1]}[rgb]{1,1,0.8} % cream yellow for column-1 %\backgroundcolor{g}[rgb]{0.8,1,1} % \backgroundcolor{l}[rgb]{0,0,0.7} % dark blue for left margin

\paracolbackgroundoptions

% 0.9,0.9,0.9 -- 0.8,0.8,0.8


\footnotesize
{\setasidefontcolour
\flushright
\begin{center}
    % Place your profile picture here. 
    % Make sure the image file exists in the directory.
    \roundpic{profile_picture.jpg} 
\end{center}

\bg{cvgreen}{white}{About me}\\[0.5em]

{\footnotesize
Write a short professional summary about yourself here. Describe your main goals, your work ethic, and what you bring to the table.
}
\bigskip

\bg{cvgreen}{white}{Personal} \\[0.5em]
[Name Surname]

Nationality: [Country]

\bigskip

\bg{cvgreen}{white}{Areas of specialization} \\[0.5em]

[Skill 1] ~•~ [Skill 2] ~•~ [Skill 3] ~•~ [Skill 4]

\bigskip



\bigskip

\bg{cvgreen}{white}{Interests}\\[0.5em]

[Hobby 1] ~•~ [Hobby 2] ~•~ [Hobby 3]
\bigskip

\bg{cvgreen}{white}{Tech Stack}\\[0.5em]

\texttt{Program A} ~/~ \texttt{Program B} ~/~ \texttt{Program C}

\texttt{Tool A} ~/~ \texttt{Tool B} ~/~ \texttt{Tool C}

\vspace{4em}

\infobubble{\faAt}{cvgreen}{white}{email@example.com}
\infobubble{\faTwitter}{cvgreen}{white}{@twitterhandle}
\infobubble{\faFacebook}{cvgreen}{white}{Facebook Name}
\infobubble{\faGithub}{cvgreen}{white}{github_username}
\infobubble{\faLinkedin}{cvgreen}{white}{linkedin_username}

\phantom{turn the page}

\phantom{turn the page}
}
%-----------------------------------------------------------
\switchcolumn

\small
\section*{Experience}

\begin{tabular}{r| p{0.5\textwidth} c}
    % \cvevent{Dates}{Job Title}{Role/Company}{Location}{Description}{LogoFile}
    % Dates removed (first argument left empty)
    \cvevent{}{Job Title}{Company Name}{City, Country}{Description of your achievements and responsibilities in this role.}{logo.png} \\
    \cvevent{}{Previous Job Title}{Company Name}{City, Country}{Description of your achievements and responsibilities in this role.}{logo.png}
\end{tabular}
\vspace{3em}

\begin{minipage}[t]{0.35\textwidth}
\section*{Education}
\begin{tabular}{r p{0.6\textwidth} c}
    % \cvdegree{Year}{Degree Title}{Institution Type}{University}{Description/Grade}{LogoFile}
    % Years and Specific Degrees removed
    \cvdegree{}{Major / Subject}{Qualification}{University Name \color{headerblue}}{}{logo.png} \\
    \cvdegree{}{Major / Subject}{Qualification}{University Name \color{headerblue}}{}{logo.png} \\
    \cvdegree{}{Major / Subject}{Qualification}{School Name \color{headerblue}}{}{logo.png}
\end{tabular}
\end{minipage}\hfill
\begin{minipage}[t]{0.3\textwidth}
\section*{Skills}
\begin{tabular}{r @{\hspace{0.5em}}l}
     % Usage: \bg{skilllabelcolour}{iconcolour}{Skill Name} & \barrule{Level (0.0 to 1.0)}{height}{color}
     \bg{skilllabelcolour}{iconcolour}{Skill A} &  \barrule{0.9}{0.5em}{cvpurple}\\
     \bg{skilllabelcolour}{iconcolour}{Skill B} & \barrule{0.7}{0.5em}{cvgreen} \\
     \bg{skilllabelcolour}{iconcolour}{Skill C} & \barrule{0.6}{0.5em}{cvpurple} \\
     \bg{skilllabelcolour}{iconcolour}{Skill D} & \barrule{0.4}{0.5em}{cvpurple} \\
     \bg{skilllabelcolour}{iconcolour}{Skill E} & \barrule{0.2}{0.5em}{cvpurple} \\
\end{tabular}
\end{minipage}

\section*{Projects}
\begin{tabular}{r| p{0.5\textwidth} c}
    \cvevent{}{Project Lead}{Company}{City}{Led a team of X people to achieve Y results.}{logo.png} \\
    \cvevent{}{Freelance Work}{Self-Employed}{Remote}{Completed various projects involving X, Y, and Z.}{logo.png} \\
\end{tabular}
\vspace{3em}

\begin{minipage}[t]{0.3\textwidth}
\section*{Certificates \& Grants}
% Adjusted table to remove Date column, replaced with bullet
\begin{tabular}{c p{0.8\textwidth}}
    \textbullet & Certification Name \\
    \textbullet & Award Name \\
    \textbullet & Scholarship / Grant Name
\end{tabular}
\bigskip

\section*{Languages}
\begin{tabular}{l | ll}
\textbf{English} & C2 & {\phantom{x}\footnotesize Native} \\
\textbf{Language 2} & C1 & \pictofraction{\faCircle}{cvgreen}{3}{black!30}{1}{\tiny} \\
\textbf{Language 3} & B2 & \pictofraction{\faCircle}{cvgreen}{2}{black!30}{2}{\tiny} \\
\textbf{Language 4} & A2 & \pictofraction{\faCircle}{cvgreen}{1}{black!30}{3}{\tiny}
\end{tabular}
\bigskip

\end{minipage}\hfill
\begin{minipage}[t]{0.3\textwidth}
\section*{Publications}
% Adjusted table to remove Date column, replaced with bullet
\begin{tabular}{c p{0.8\textwidth}}
    \textbullet & \emph{Title of Book or Significant Article}, Publisher Name. \\
    \textbullet & ``Title of Paper'', in: \emph{Journal Name}.
\end{tabular}
\bigskip

\section*{Talks}
% Adjusted table to remove Date column, replaced with bullet
\begin{tabular}{c p{0.8\textwidth}}
    \textbullet & ``Title of Presentation'', at: \emph{Conference Name} in City.
\end{tabular}
\end{minipage}






\vfill{} % Whitespace before final footer

%----------------------------------------------------------------------------------------
%	FINAL FOOTER
%----------------------------------------------------------------------------------------
\setlength{\parindent}{0pt}
\begin{minipage}[t]{\rightcolwidth}
\begin{center}\fontfamily{\sfdefault}\selectfont \color{black!70}
{\small Name Surname \icon{\faEnvelopeO}{cvgreen}{} Address/Street \icon{\faMapMarker}{cvgreen}{} City, Country \icon{\faPhone}{cvgreen}{} +1 555 123 4567 \newline\icon{\faAt}{cvgreen}{} \protect\url{email@example.com}
}
\end{center}
\end{minipage}

\end{paracol}

\end{document}