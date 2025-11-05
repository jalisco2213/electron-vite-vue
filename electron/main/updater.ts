import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';
import ProgressBar from 'electron-progressbar';

autoUpdater.autoDownload = false;

export const checkAndApplyUpdates = (): void => {
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    dialog.showErrorBox('Ошибка', `${err} произошла при поиске обновлений`);
  });

  let progressBar: ProgressBar | undefined;

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'jalisco2213',
    repo: 'electron-vite-vue',
  });

  autoUpdater.on('update-available', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: 'Доступно новое обновление. Хотите обновить сейчас?',
        buttons: ['Обновить', 'Нет'],
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.downloadUpdate();
          progressBar = new ProgressBar({
            indeterminate: false,
            text: 'Подготовка данных...',
            detail: 'Подождите...',
            abortOnError: true,
            closeOnComplete: false,
            browserWindow: {
              alwaysOnTop: true,
            },
          });

          progressBar
            .on('completed', function () {
              if (progressBar) {
                progressBar.detail = 'Обновления загружены. Готовим установку.';
              }
            })
            .on('progress', function (value: number) {
              if (progressBar) {
                progressBar.detail = `Значение ${value} из ${progressBar.getOptions().maxValue}...`;
              }
            });
        }
      })
      .catch((err) => dialog.showErrorBox('Ошибка', 'Ошибка при загрузке обновления: ' + err));
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (progressBar) {
      progressBar.value = progressObj.percent;
    }
  });

  autoUpdater.on('error', (err) => {
    dialog.showErrorBox(
      'Ошибка обновления',
      'Произошла ошибка во время процесса обновления: ' + err.message
    );
    if (progressBar) {
      progressBar.close();
      progressBar = undefined;
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (progressBar) {
      progressBar.close();
      progressBar = undefined;
    }
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: 'Обновление загружено. Хотите выйти и перезапустить?',
        buttons: ['Выйти', 'Позже'],
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });
};