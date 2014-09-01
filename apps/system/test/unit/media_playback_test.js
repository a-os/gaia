/* global MocksHelper, MockAppWindowManager, MockL10n,
   MediaPlaybackWidget */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_app_window_manager.js');

var mocksForMediaPlayback = new MocksHelper([
  'AppWindowManager'
]).init();

suite('system/media playback widget', function() {
  mocksForMediaPlayback.attachTestHelpers();
  var realL10n, realAppWindowManager;
  var widget;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realAppWindowManager = window.appWindowManager;
    window.appWindowManager = new MockAppWindowManager();
    requireApp('system/js/media_playback.js', function() {
      widget = new MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'}
      );
      widget.origin = null;
      done();
    });
  });

  suiteTeardown(function() {
    window.appWindowManager = realAppWindowManager;
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite('handleMessage', function() {
    var stubAppInfo, stubNowPlaying, stubPlaybackStatus;

    function sendMediaCommsIAC(message) {
      var evt = new CustomEvent('iac-mediacomms', { detail: message });
      window.dispatchEvent(evt);
    }

    setup(function() {
      stubAppInfo = this.sinon.stub(widget, 'updateAppInfo');
      stubNowPlaying = this.sinon.stub(widget, 'updateNowPlaying');
      stubPlaybackStatus = this.sinon.stub(widget, 'updatePlaybackStatus');
    });

    test('updateAppInfo', function() {
      sendMediaCommsIAC({ type: 'appinfo', data: 'appinfo-data' });
      assert.isTrue(stubAppInfo.calledOnce);
      assert.isTrue(stubAppInfo.calledWith('appinfo-data'));
    });

    test('updateNowPlaying', function() {
      sendMediaCommsIAC({ type: 'nowplaying', data: 'nowplaying-data' });
      assert.isTrue(stubNowPlaying.calledOnce);
      assert.isTrue(stubNowPlaying.calledWith('nowplaying-data'));
    });

    test('updatePlaybackStatus', function() {
      sendMediaCommsIAC({ type: 'status', data: 'status-data' });
      assert.isTrue(stubPlaybackStatus.calledOnce);
      assert.isTrue(stubPlaybackStatus.calledWith('status-data'));
    });
  });

  suite('updateAppInfo', function() {
    teardown(function() {
      widget.origin = null;
    });

    test('Do nothing if no app info provided', function() {
      widget.updateAppInfo();
      assert.isNull(widget.origin);
    });

    test('Update app info', function() {
      var info = { origin: 'origin' };
      widget.updateAppInfo(info);
      assert.equal(widget.origin, info.origin);
    });
  });

  suite('updateNowPlaying', function() {
    teardown(function() {
      widget.track.textContent = '';
    });

    test('Do nothing if no metadata provided', function() {
      widget.updateNowPlaying();
      assert.equal(widget.track.textContent, '');
    });

    test('Update now playing', function() {
      var metadata = { title: 'title', artist: 'artist' };
      widget.updateNowPlaying(metadata);
      assert.equal(widget.track.textContent, 'title — artist');
    });
  });

  suite('updatePlaybackStatus', function() {
    test('play', function() {
      widget.updatePlaybackStatus({ playStatus: 'PLAYING' });
      assert.isFalse(widget.hidden);
      assert.equal(widget.playPauseButton.dataset.icon, 'pause');
    });

    test('pause', function() {
      widget.updatePlaybackStatus({ playStatus: 'PAUSED' });
      assert.isFalse(widget.hidden);
      assert.equal(widget.playPauseButton.dataset.icon, 'play');
    });

    test('stop', function() {
      widget.updatePlaybackStatus({ playStatus: 'STOPPED' });
      assert.isTrue(widget.hidden);
    });

    test('mozinterruptbegin', function() {
      widget.updatePlaybackStatus({ playStatus: 'mozinterruptbegin' });
      assert.isTrue(widget.hidden);
    });
  });

  suite('openMediaApp', function() {
    var stubDispatchEvent;

    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    });

    teardown(function() {
      widget.origin = null;
    });

    test('Do nothing if no app origin', function() {
      widget.openMediaApp();
      assert.isFalse(stubDispatchEvent.called);
    });

    test('Open media app', function() {
      widget.origin = 'app://www.fake';
      widget.openMediaApp();
      assert.isTrue(stubDispatchEvent.called);
    });
  });

  suite('handleContextmenu', function() {
    var stubSendCommand;

    setup(function() {
      stubSendCommand = this.sinon.stub(widget, 'sendCommand');
    });

    teardown(function() {
      widget.isFastSeeking = false;
    });

    test('handleContextmenu - rewind start', function() {
      var event = { target: widget.previousButton };
      widget.handleContextmenu(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('rewindstart'));
      assert.isTrue(widget.isFastSeeking);
    });

    test('handleContextmenu - fastforward start', function() {
      var event = { target: widget.nextButton };
      widget.handleContextmenu(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('fastforwardstart'));
      assert.isTrue(widget.isFastSeeking);
    });
  });

  suite('handleClick', function() {
    var stubSendCommand;

    setup(function() {
      stubSendCommand = this.sinon.stub(widget, 'sendCommand');
    });

    test('handleClick - previous track', function() {
      var event = { target: widget.previousButton };
      widget.handleClick(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('prevtrack'));
    });

    test('handleClick - next track', function() {
      var event = { target: widget.nextButton };
      widget.handleClick(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('nexttrack'));
    });

    test('handleClick - rewind end', function() {
      var event = { target: widget.previousButton };
      widget.isFastSeeking = true;
      widget.handleClick(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('rewindend'));
      assert.isFalse(widget.isFastSeeking);
    });

    test('handleClick - fastforward end', function() {
      var event = { target: widget.nextButton };
      widget.isFastSeeking = true;
      widget.handleClick(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('fastforwardend'));
      assert.isFalse(widget.isFastSeeking);
    });

    test('handleClick - play pause', function() {
      var event = { target: widget.playPauseButton };
      widget.handleClick(event);
      assert.isTrue(stubSendCommand.calledOnce);
      assert.isTrue(stubSendCommand.calledWith('playpause'));
    });
  });

});
