PAPER = main
LATEX = pdflatex
BIBTEX = bibtex

.PHONY: all clean

all: $(PAPER).pdf

$(PAPER).pdf: $(PAPER).tex references.bib
	$(LATEX) $(PAPER)
	$(BIBTEX) $(PAPER)
	$(LATEX) $(PAPER)
	$(LATEX) $(PAPER)

clean:
	rm -f *.aux *.bbl *.blg *.fdb_latexmk *.fls *.log *.out *.synctex.gz

arxiv-archive:
	tar -czf ../../simurgh-arxiv-submission.tar.gz \
	  main.tex main.bbl references.bib
