import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Redirect } from 'react-router';

import { attScore } from '../redux/actions';
import { fetchQuestions } from '../services';
import { setDifficulty, saveLocalStorage } from '../auxiliaryFuncs/funcs';

const FINAL_QUESTION = 4;

class QuestionCard extends Component {
  constructor() {
    super();
    this.state = {
      questions: [],
      questionNumber: 0,
      loading: true,
      questionBtnClicked: false,
      redirect: false,
      time: 30,
    };
    this.setQuestions = this.setQuestions.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.nextQuestion = this.nextQuestion.bind(this);
    this.renderNextBtn = this.renderNextBtn.bind(this);
    this.redirectFeedback = this.redirectFeedback.bind(this);
    this.timer = 0;
    this.startTimer = this.startTimer.bind(this);
    this.countDown = this.countDown.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.updateScore = this.updateScore.bind(this);
  }

  componentDidMount() {
    this.setQuestions();
    this.startTimer();
  }

  componentDidUpdate() {
    const { time } = this.state;
    if (time === 0) { this.stopTimer(); }
  }

  async setQuestions() {
    const token = localStorage.getItem('token');
    const questions = await fetchQuestions(token);
    this.setState({
      questions,
      loading: false,
    });
  }

  startTimer() {
    const ONE_SECOND = 1000;
    this.timer = setInterval(this.countDown, ONE_SECOND);
  }

  countDown() {
    this.setState((prevState) => ({
      time: prevState.time - 1,
    }));
  }

  stopTimer() {
    clearInterval(this.timer);
  }

  async handleClick({ target }) {
    this.setState({
      questionBtnClicked: true,
    });

    this.stopTimer();
    await this.updateScore(target);

    const correctButton = document.querySelector('.correctButton');
    const incorrectButtons = document.querySelectorAll('.incorrectButtons');

    correctButton.style.border = '3px solid rgb(6, 240, 15)';
    incorrectButtons.forEach((element) => {
      element.style.border = '3px solid rgb(255, 0, 0)';
    });

    const { name, assertions, score, gravatarEmail } = this.props;
    const player = {
      name,
      assertions,
      score,
      gravatarEmail,
    };
    saveLocalStorage(player);
  }

  async updateScore(target) {
    const { time, questions, questionNumber } = this.state;
    const { setAttScore } = this.props;

    const PONTUACAO_ACERTO = 10;
    const totalScore = time * setDifficulty(questions, questionNumber) + PONTUACAO_ACERTO;

    if (target.className === 'correctButton') {
      await setAttScore(totalScore);
    }
  }

  nextQuestion() {
    const { questionNumber } = this.state;
    const correctButton = document.querySelector('.correctButton');
    const incorrectButtons = document.querySelectorAll('.incorrectButtons');

    correctButton.style.border = '1px solid';
    correctButton.style.borderRadius = '2px';
    incorrectButtons.forEach((element) => {
      element.style.border = '1px solid';
      element.style.borderRadius = '2px';
    });

    this.setState((prevState) => ({
      questionBtnClicked: false,
      questionNumber: prevState.questionNumber + 1,
      time: 30,
    }));

    this.startTimer();

    if (questionNumber === FINAL_QUESTION) return this.redirectFeedback();
  }

  redirectFeedback() {
    this.setState({
      redirect: true,
    });
  }

  buttonsArray() {
    const { questions, questionNumber } = this.state;
    const { correct_answer: correctAnswer,
      incorrect_answers: incorrectAnswers,
    } = questions[questionNumber];
    const answersButtons = [correctAnswer, ...incorrectAnswers];
    console.log(answersButtons);
    const shuffleButtons = answersButtons.sort();
    return shuffleButtons;
  }

  renderButtons() {
    const { questions, questionNumber, questionBtnClicked, time } = this.state;
    const buttons = questions.length > 0 && (
      this.buttonsArray().map((answers, index) => (
        <button
          data-testid={ answers === questions[questionNumber].correct_answer
            ? 'correct-answer' : `wrong-answer-${index}` }
          type="button"
          key={ index }
          className={ answers === questions[questionNumber].correct_answer
            ? 'correctButton' : 'incorrectButtons' }
          disabled={ questionBtnClicked || time === 0 }
          onClick={ this.handleClick }
        >
          {answers}
        </button>
      ))
    );
    return buttons;
  }

  renderNextBtn() {
    const { questionBtnClicked, questionNumber } = this.state;

    if (questionNumber === FINAL_QUESTION && questionBtnClicked) {
      return (
        <div>
          <button
            data-testid="btn-next"
            type="button"
            onClick={ this.redirectFeedback }
          >
            Ver Resultado
          </button>
        </div>
      );
    }
    if (questionNumber !== FINAL_QUESTION && questionBtnClicked) {
      return (
        <div>
          <button
            data-testid="btn-next"
            type="button"
            onClick={ this.nextQuestion }
          >
            Próxima
          </button>
        </div>
      );
    }
  }

  render() {
    const { questions, questionNumber, loading, redirect, time } = this.state;

    if (loading) return <h1>Loading...</h1>;

    if (redirect) return <Redirect to="/feedback" />;

    return (
      <section>
        <div>
          <h1
            data-testid="question-category"
          >
            { questions[questionNumber].category }
          </h1>
          <h3 data-testid="question-text">{ questions[questionNumber].question }</h3>
          { this.renderButtons() }
        </div>
        <div>
          <section>
            { time > 0 ? `${time} segundos` : 'Seu tempo acabou!' }
          </section>
        </div>
        { this.renderNextBtn() }
      </section>
    );
  }
}

QuestionCard.propTypes = {
  setAttScore: PropTypes.func,
  score: PropTypes.number,
  name: PropTypes.string,
  gravatarEmail: PropTypes.string,
  assertions: PropTypes.number,
}.isRequired;

const mapStateToProps = (state) => ({
  name: state.player.name,
  assertions: state.player.assertions,
  score: state.player.score,
  gravatarEmail: state.player.gravatarEmail,
});

const mapDispatchToProps = (dispatch) => ({
  setAttScore: (time, difficulty) => dispatch(attScore(time, difficulty)),
});

export default connect(mapStateToProps, mapDispatchToProps)(QuestionCard);
