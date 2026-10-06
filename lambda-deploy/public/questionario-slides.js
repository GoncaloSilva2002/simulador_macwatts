(() => {
  const form = document.getElementById('questionnaireForm');
  const questions = [...form.querySelectorAll('fieldset.question')];
  const invoice = form.querySelector('[aria-labelledby="section03"]');
  const slides = [...questions, invoice];
  const progress = document.getElementById('questionProgress');
  const counter = document.getElementById('questionCounter');
  const category = document.getElementById('questionCategory');
  const fill = document.getElementById('questionProgressFill');
  const navigation = document.getElementById('slideNavigation');
  const previous = document.getElementById('previousQuestion');
  const next = document.getElementById('nextQuestion');
  const hint = document.getElementById('slideHint');
  const submit = document.querySelector('button[form="questionnaireForm"]');
  let active = 0;
  let advanceTimer;
  let animation;

  // Move existing controls, keeping their values, listeners and form ownership.
  form.replaceChildren(...slides);
  form.classList.add('slide-form');
  slides.forEach((slide) => {
    slide.classList.add('question-slide');
    const heading = slide.querySelector('legend, h2');
    heading.tabIndex = -1;
  });
  navigation.append(submit);
  progress.hidden = false;
  navigation.hidden = false;

  function show(index, focus = true) {
    clearTimeout(advanceTimer);
    const direction = index < active ? -1 : 1;
    active = Math.max(0, Math.min(slides.length - 1, index));
    animation?.cancel();
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    counter.textContent = `Pergunta ${active + 1} de ${slides.length}`;
    category.textContent = active < 3 ? 'A sua casa' : active < 5 ? 'Os seus h\u00e1bitos' : 'A sua fatura';
    fill.style.width = `${((active + 1) / slides.length) * 100}%`;
    previous.disabled = active === 0;
    next.hidden = active === slides.length - 1;
    submit.hidden = active !== slides.length - 1;
    hint.hidden = active === slides.length - 1;
    if (focus) {
      const heading = slides[active].querySelector('legend, h2');
      heading.focus({ preventScroll: true });
      if (progress.getBoundingClientRect().top < 0) progress.scrollIntoView({ block: 'start' });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animation = slides[active].animate([
          { opacity: 0, transform: `translateX(${direction * 24}px)` },
          { opacity: 1, transform: 'translateX(0)' }
        ], { duration: 240, easing: 'ease-out' });
      }
    }
  }

  function advance() {
    const input = slides[active].querySelector('input[type="radio"]');
    if (input && !slides[active].querySelector('input:checked')) {
      input.reportValidity();
      return;
    }
    if (active < slides.length - 1) show(active + 1);
  }

  questions.forEach((slide, index) => {
    slide.addEventListener('keydown', (event) => {
      if (event.key !== ' ' || !event.target.matches('input[type="radio"]')) return;
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => { if (active === index) advance(); }, 260);
    });
    // Click also handles reselecting the same answer after returning to a slide.
    slide.addEventListener('click', (event) => {
      if (!event.target.matches('input[type="radio"]')) return;
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => { if (active === index) advance(); }, 260);
    });
    slide.addEventListener('change', (event) => {
      if (!event.target.matches('input[type="radio"]')) return;
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => { if (active === index) advance(); }, 260);
    });
  });
  previous.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', advance);
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && active < slides.length - 1) {
      event.preventDefault();
      advance();
    }
  });
  form.addEventListener('submit', (event) => {
    if (active < slides.length - 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      advance();
    }
  }, true);
  form.addEventListener('invalid', (event) => {
    const index = slides.findIndex(slide => slide.contains(event.target));
    if (index >= 0 && index !== active) show(index);
  }, true);
  show(0, false);
})();
