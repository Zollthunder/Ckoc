# A teljes C-kocka modell újragenerálása az MCP-n keresztül (új dokumentumba), párbeszédablakok nélkül.
import adsk.core, os, importlib.util

SCRIPT = os.path.join(os.path.expanduser('~'), 'Desktop', 'klódakszing', '3d', 'fusion', 'CKocka', 'CKocka.py')


def run(_context: str):
    os.environ['CKOCKA_SILENT'] = '1'
    try:
        spec = importlib.util.spec_from_file_location('ckocka_gen', SCRIPT)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.run(None)
        doc = adsk.core.Application.get().activeDocument
        print('Új C-kocka dokumentum kész: %s' % doc.name)
    finally:
        os.environ.pop('CKOCKA_SILENT', None)
